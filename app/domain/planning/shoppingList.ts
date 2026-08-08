import { STORE_IDS, type CurrencyCode, type Offer, type StoreId, type WeekPlan } from "~/domain/types";
import {
  offerPricesMatchingIngredient,
  offersMatchingIngredient,
  productTokens,
  type IngredientOfferPrice,
} from "~/domain/recipes/ingredientOfferScore";

/**
 * A matched offer's price for this item, at one store. Kept per store rather
 * than collapsed to a single number — the same ingredient line can be on
 * offer at more than one of the family's selected stores, at different
 * prices, and picking one to show would misrepresent the others as "no
 * offer."
 */
export type ShoppingListItemPrice = IngredientOfferPrice;

/** One line to buy, with the days that need it. */
export interface ShoppingListItem {
  /** The ingredient line as the recipe wrote it, from the first day that needs it. */
  label: string;
  /** Every verbatim variant merged into this item, for the ones that differ in wording. */
  variants: string[];
  /** ISO dates of the days needing it, in plan order. */
  dates: string[];
  /** Recipe titles needing it, in plan order. */
  recipeTitles: string[];
  /** Offer names covering it this week, if any. */
  offerNames: string[];
  /** Every store whose offer(s) matched this item, for a "also on offer at X" note. */
  offerStoreIds: StoreId[];
  /**
   * The matched offer's price at each store in `offerStoreIds`, one entry
   * per store. Deliberately not a quantity-scaled cost — the ingredient line
   * is free text ("1 bakke cherrytomater"), so this is "what the matched
   * offer costs," not "what buying this ingredient costs."
   */
  prices: ShoppingListItemPrice[];
}

/** One department within a store's section, or `null` for ingredients no offer identified a department for. */
export interface ShoppingListDepartmentGroup {
  departmentSlug: string | null;
  items: ShoppingListItem[];
}

/** One store's items, or `null` for ingredients no offer at any store matched. */
export interface ShoppingListSection {
  storeId: StoreId | null;
  departments: ShoppingListDepartmentGroup[];
}

/**
 * What the matched-offer items would cost at one store — not the basket
 * total, since `itemCount` of the list's `itemCount` items have no matched
 * offer at all and aren't included. `itemCount` here counts only the items
 * priced at this particular store, so a UI can say "163 kr for 8 of 12
 * items on offer at REMA 1000."
 */
export interface ShoppingListStoreTotal {
  storeId: StoreId;
  total: number;
  itemCount: number;
  currencyCode: CurrencyCode;
}

export interface ShoppingList {
  weekStartDate: string;
  sections: ShoppingListSection[];
  itemCount: number;
  /** How many items are covered by an offer this week. */
  onOfferCount: number;
  /** Per-store subtotal of the priced (on-offer) items only, one entry per store with at least one priced item. */
  storeTotals: ShoppingListStoreTotal[];
}

/**
 * Merge key for two ingredient lines that name the same product.
 *
 * Uses the same product tokens offer matching does, so "2 løg" and "1 løg,
 * finthakket" collapse into one line while "løg" and "hvidløg" stay apart.
 * Falls back to the trimmed lowercase line when a line tokenizes to nothing
 * (e.g. "salt og peber"), which keeps unmergeable oddities visible rather
 * than silently grouping them together.
 *
 * Exported so callers outside this module can ask "is this ingredient
 * already a line on the list" without duplicating the merge rule — see
 * `findShoppingListItem`.
 */
export function shoppingListMergeKey(ingredientLine: string): string {
  const tokens = productTokens(ingredientLine);
  return tokens.length > 0 ? tokens.join(" ") : ingredientLine.trim().toLowerCase();
}

/**
 * Department ordering follows a rough walk through the store — produce
 * first, freezer and dry goods last — so the list reads in the order things
 * are picked up. Unknown departments keep their first-seen order after
 * these, and un-departmented items (no matching offer) come last.
 *
 * This is REMA's own department taxonomy; other stores' Tjek `category_ids`
 * won't line up with it, so within a non-REMA store's section this ordering
 * is only a reasonable-effort default, not a precise walk of that store's
 * actual layout.
 */
const DEPARTMENT_ORDER = [
  "fruit-and-veg",
  "bread-and-bakery",
  "meat-and-fish",
  "dairy-and-eggs",
  "cooling",
  "frozen",
  "dry-goods",
  "drinks",
];

function departmentRank(slug: string | null): number {
  if (slug === null) return Number.MAX_SAFE_INTEGER;
  const index = DEPARTMENT_ORDER.indexOf(slug);
  return index === -1 ? DEPARTMENT_ORDER.length : index;
}

function storeRank(storeId: StoreId | null, storeOrder: StoreId[]): number {
  if (storeId === null) return Number.MAX_SAFE_INTEGER;
  const index = storeOrder.indexOf(storeId);
  return index === -1 ? storeOrder.length : index;
}

/**
 * Aggregates a week's seven recipes into one shopping list: every ingredient
 * line, merged across days, grouped by the store and department of the offer
 * that covers it, and marked with that offer.
 *
 * Quantities are deliberately not summed. The source lines are free text
 * from REMA's recipe pages ("1 bakke cherrytomater", "et par kviste timian"),
 * and a wrong total is worse than two honest lines — so a merged item keeps
 * every variant it absorbed and the days that need them.
 *
 * `offers` must already be narrowed to what the family can actually use
 * (selected stores, and member-only offers only for stores they hold
 * membership at — see `offerIsUsable`) before being passed in; this function
 * is a pure grouping step and doesn't re-check either.
 *
 * `storeOrder` controls which store's section comes first — normally the
 * family's `FamilyStoreSettings.selectedStores` order — falling back to the
 * app's declared `STORE_IDS` order when omitted.
 *
 * `extraLines` folds in ingredients added by hand (see
 * `shoppingListExtraItems` in the schema) through the exact same merge —
 * adding "løg" by hand when a recipe already calls for "2 løg" becomes one
 * line, not two. They carry no day or recipe, since they aren't tied to
 * either.
 */
export function buildShoppingList(
  week: WeekPlan,
  offers: Offer[],
  storeOrder: StoreId[] = [...STORE_IDS],
  extraLines: string[] = [],
): ShoppingList {
  const items = new Map<
    string,
    ShoppingListItem & { storeId: StoreId | null; departmentSlug: string | null }
  >();

  function absorb(line: string, date: string | null, recipeTitle: string | null): void {
    const key = shoppingListMergeKey(line);
    const matches = offersMatchingIngredient(line, offers);
    const matchStoreIds = [...new Set(matches.map((offer) => offer.storeId))];
    const matchPrices = offerPricesMatchingIngredient(line, offers);
    const existing = items.get(key);

    if (existing) {
      if (!existing.variants.includes(line)) existing.variants.push(line);
      if (date && !existing.dates.includes(date)) existing.dates.push(date);
      if (recipeTitle && !existing.recipeTitles.includes(recipeTitle)) {
        existing.recipeTitles.push(recipeTitle);
      }
      for (const offer of matches) {
        if (!existing.offerNames.includes(offer.name)) existing.offerNames.push(offer.name);
      }
      for (const storeId of matchStoreIds) {
        if (!existing.offerStoreIds.includes(storeId)) existing.offerStoreIds.push(storeId);
      }
      for (const price of matchPrices) {
        if (!existing.prices.some((p) => p.storeId === price.storeId)) existing.prices.push(price);
      }
      existing.storeId ??= matches[0]?.storeId ?? null;
      existing.departmentSlug ??= matches[0]?.departmentSlug ?? null;
      return;
    }

    items.set(key, {
      label: line,
      variants: [line],
      dates: date ? [date] : [],
      recipeTitles: recipeTitle ? [recipeTitle] : [],
      offerNames: matches.map((offer) => offer.name),
      offerStoreIds: matchStoreIds,
      prices: matchPrices,
      storeId: matches[0]?.storeId ?? null,
      departmentSlug: matches[0]?.departmentSlug ?? null,
    });
  }

  for (const day of week.days) {
    for (const line of day.recipeSnapshot.ingredientLines) {
      absorb(line, day.date, day.recipeSnapshot.title);
    }
  }
  for (const line of extraLines) {
    absorb(line, null, null);
  }

  const storeSections = new Map<StoreId | null, Map<string | null, ShoppingListItem[]>>();
  for (const { storeId, departmentSlug, ...item } of items.values()) {
    let departments = storeSections.get(storeId);
    if (!departments) {
      departments = new Map();
      storeSections.set(storeId, departments);
    }
    const section = departments.get(departmentSlug);
    if (section) section.push(item);
    else departments.set(departmentSlug, [item]);
  }

  const ordered = [...storeSections.entries()]
    .map(([storeId, departments]) => ({
      storeId,
      departments: [...departments.entries()]
        .map(([departmentSlug, sectionItems]) => ({
          departmentSlug,
          items: sectionItems.sort((a, b) => a.label.localeCompare(b.label, "da")),
        }))
        .sort((a, b) => departmentRank(a.departmentSlug) - departmentRank(b.departmentSlug)),
    }))
    .sort((a, b) => storeRank(a.storeId, storeOrder) - storeRank(b.storeId, storeOrder));

  const allItems = ordered.flatMap((section) => section.departments.flatMap((d) => d.items));

  const totalsByStore = new Map<StoreId, { total: number; itemCount: number; currencyCode: CurrencyCode }>();
  for (const item of allItems) {
    for (const price of item.prices) {
      const existing = totalsByStore.get(price.storeId);
      if (existing) {
        existing.total += price.price;
        existing.itemCount += 1;
      } else {
        totalsByStore.set(price.storeId, { total: price.price, itemCount: 1, currencyCode: price.currencyCode });
      }
    }
  }
  const storeTotals: ShoppingListStoreTotal[] = [...totalsByStore.entries()]
    .map(([storeId, totals]) => ({ storeId, ...totals }))
    .sort((a, b) => storeRank(a.storeId, storeOrder) - storeRank(b.storeId, storeOrder));

  return {
    weekStartDate: week.weekStartDate,
    sections: ordered,
    itemCount: allItems.length,
    onOfferCount: allItems.filter((item) => item.offerNames.length > 0).length,
    storeTotals,
  };
}

/**
 * The list's own line for an ingredient, if it has one — so a view showing an
 * ingredient from somewhere else (a recipe not on this week's plan, say) can
 * ask "is this already on the list" instead of guessing from text equality.
 *
 * Matches on `shoppingListMergeKey`, the same rule the list was merged with,
 * so it agrees with the list about which lines are "the same ingredient" —
 * an ingredient a recipe phrases as "2 løg" is found by a lookup for "1 løg,
 * finthakket" the way a shopper would expect.
 */
export function findShoppingListItem(list: ShoppingList | null, ingredientLine: string): ShoppingListItem | null {
  if (!list) return null;
  const key = shoppingListMergeKey(ingredientLine);
  for (const section of list.sections) {
    for (const department of section.departments) {
      const found = department.items.find((item) => shoppingListMergeKey(item.label) === key);
      if (found) return found;
    }
  }
  return null;
}
