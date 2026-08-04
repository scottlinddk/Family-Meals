import type { Offer, WeekPlan } from "~/domain/types";
import { offersMatchingIngredient, productTokens } from "~/domain/recipes/ingredientOfferScore";

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
}

export interface ShoppingListSection {
  /** REMA department slug, or `null` for ingredients no offer identified. */
  departmentSlug: string | null;
  items: ShoppingListItem[];
}

export interface ShoppingList {
  weekStartDate: string;
  sections: ShoppingListSection[];
  itemCount: number;
  /** How many items are covered by an offer this week. */
  onOfferCount: number;
}

/**
 * Merge key for two ingredient lines that name the same product.
 *
 * Uses the same product tokens offer matching does, so "2 løg" and "1 løg,
 * finthakket" collapse into one line while "løg" and "hvidløg" stay apart.
 * Falls back to the trimmed lowercase line when a line tokenizes to nothing
 * (e.g. "salt og peber"), which keeps unmergeable oddities visible rather
 * than silently grouping them together.
 */
function mergeKey(ingredientLine: string): string {
  const tokens = productTokens(ingredientLine);
  return tokens.length > 0 ? tokens.join(" ") : ingredientLine.trim().toLowerCase();
}

/**
 * Department ordering follows a rough walk through the store — produce
 * first, freezer and dry goods last — so the list reads in the order things
 * are picked up. Unknown departments keep their first-seen order after
 * these, and un-departmented items (no matching offer) come last.
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

/**
 * Aggregates a week's seven recipes into one shopping list: every ingredient
 * line, merged across days, grouped by the REMA department of the offer that
 * covers it, and marked with that offer.
 *
 * Quantities are deliberately not summed. The source lines are free text
 * from REMA's recipe pages ("1 bakke cherrytomater", "et par kviste timian"),
 * and a wrong total is worse than two honest lines — so a merged item keeps
 * every variant it absorbed and the days that need them.
 */
export function buildShoppingList(week: WeekPlan, offers: Offer[]): ShoppingList {
  const items = new Map<string, ShoppingListItem & { departmentSlug: string | null }>();

  for (const day of week.days) {
    for (const line of day.recipeSnapshot.ingredientLines) {
      const key = mergeKey(line);
      const matches = offersMatchingIngredient(line, offers);
      const existing = items.get(key);

      if (existing) {
        if (!existing.variants.includes(line)) existing.variants.push(line);
        if (!existing.dates.includes(day.date)) existing.dates.push(day.date);
        if (!existing.recipeTitles.includes(day.recipeSnapshot.title)) {
          existing.recipeTitles.push(day.recipeSnapshot.title);
        }
        for (const offer of matches) {
          if (!existing.offerNames.includes(offer.name)) existing.offerNames.push(offer.name);
        }
        existing.departmentSlug ??= matches[0]?.departmentSlug ?? null;
        continue;
      }

      items.set(key, {
        label: line,
        variants: [line],
        dates: [day.date],
        recipeTitles: [day.recipeSnapshot.title],
        offerNames: matches.map((offer) => offer.name),
        departmentSlug: matches[0]?.departmentSlug ?? null,
      });
    }
  }

  const sections = new Map<string | null, ShoppingListItem[]>();
  for (const { departmentSlug, ...item } of items.values()) {
    const section = sections.get(departmentSlug);
    if (section) section.push(item);
    else sections.set(departmentSlug, [item]);
  }

  const ordered = [...sections.entries()]
    .map(([departmentSlug, sectionItems]) => ({
      departmentSlug,
      items: sectionItems.sort((a, b) => a.label.localeCompare(b.label, "da")),
    }))
    .sort((a, b) => departmentRank(a.departmentSlug) - departmentRank(b.departmentSlug));

  const allItems = ordered.flatMap((section) => section.items);

  return {
    weekStartDate: week.weekStartDate,
    sections: ordered,
    itemCount: allItems.length,
    onOfferCount: allItems.filter((item) => item.offerNames.length > 0).length,
  };
}
