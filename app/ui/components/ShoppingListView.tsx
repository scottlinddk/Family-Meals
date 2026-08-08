import { useMemo } from "react";
import type {
  ShoppingList,
  ShoppingListItem,
  ShoppingListItemPrice,
  ShoppingListSection,
  ShoppingListStoreTotal,
} from "~/domain/planning/shoppingList";
import { shoppingListProgress } from "~/domain/planning/shoppingListMarks";
import { STORE_NAMES } from "~/domain/stores";
import type { ShoppingListMarks } from "~/ui/hooks/useShoppingListMarks";
import { Card } from "~/ui/components/ui/Card";
import { Button } from "~/ui/components/ui/Button";
import { Tag } from "~/ui/components/ui/Tag";
import { t, type TranslationKey } from "~/i18n/t";

/**
 * REMA's department slugs, translated where we know them. An unrecognised
 * slug falls back to the slug itself rather than being hidden — the grouping
 * is still useful even when the label isn't ours.
 */
const DEPARTMENT_LABEL_KEYS: Record<string, TranslationKey> = {
  "fruit-and-veg": "shoppingList.dept.fruitAndVeg",
  "bread-and-bakery": "shoppingList.dept.breadAndBakery",
  "meat-and-fish": "shoppingList.dept.meatAndFish",
  "dairy-and-eggs": "shoppingList.dept.dairyAndEggs",
  cooling: "shoppingList.dept.cooling",
  frozen: "shoppingList.dept.frozen",
  "dry-goods": "shoppingList.dept.dryGoods",
  drinks: "shoppingList.dept.drinks",
};

function departmentLabel(slug: string | null): string {
  if (slug === null) return t("shoppingList.dept.other");
  const key = DEPARTMENT_LABEL_KEYS[slug];
  return key ? t(key) : slug;
}

function weekdayOf(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString("da-DK", { weekday: "short" });
}

function storeLabel(storeId: ShoppingListSection["storeId"]): string {
  return storeId === null ? t("shoppingList.otherStore") : STORE_NAMES[storeId];
}

/**
 * The list itself: departments, lines, marks and the running count.
 *
 * Shared by the two places the same list is shopped from — the signed-in
 * week page and the `/list/{token}` share link — because they are the same
 * list, marked into the same rows. Everything that differs between them
 * (chrome, sharing controls, who you are) lives in the pages; this component
 * only needs the list and something that knows how each line is marked.
 */
export function ShoppingListView({
  list,
  marks,
}: {
  list: ShoppingList;
  marks: ShoppingListMarks;
}) {
  const labels = useMemo(
    () =>
      list.sections.flatMap((section) => section.departments.flatMap((d) => d.items)).map((item) => item.label),
    [list],
  );
  const progress = shoppingListProgress(labels, marks.marks);

  return (
    <>
      <div className="mb-4 flex flex-col gap-1">
        {/* `min-w-0` on the summary text and `flex-wrap` on the row: the
            summary and the "clear marks" button are both flex items with no
            wrap otherwise, and a long summary string (or a translation
            that's longer than the Danish original) could push the button
            off the edge of a narrow phone instead of wrapping under it. */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="m-0 min-w-0 text-sm text-muted">
            {t("shoppingList.summary", {
              remaining: progress.remaining,
              total: list.itemCount,
              onOffer: list.onOfferCount,
            })}
          </p>
          {marks.clearSupported && marks.marks.size > 0 && (
            <Button type="button" variant="ghost" size="sm" onClick={() => marks.clear(labels)}>
              {t("shoppingList.clearMarks")}
            </Button>
          )}
        </div>

        {/* Only worth a line when there is one — most weeks nothing is. */}
        {progress.atHome > 0 && (
          <p className="m-0 text-xs text-muted">
            {t("shoppingList.atHomeSummary", { count: progress.atHome })}
          </p>
        )}

        {list.storeTotals.length > 0 && <StoreTotals totals={list.storeTotals} />}

        <SyncStatus marks={marks} />
      </div>

      <div className="flex flex-col gap-5">
        {list.sections.map((section) => (
          <div key={section.storeId ?? "other"}>
            <h2 className="mb-2 text-sm font-bold tracking-[0.02em] text-text uppercase">
              {storeLabel(section.storeId)}
            </h2>
            <div className="flex flex-col gap-4">
              {section.departments.map((department) => (
                <Card key={department.departmentSlug ?? "other"} as="section">
                  <h3 className="text-[11px] font-semibold tracking-[0.08em] text-muted uppercase">
                    {departmentLabel(department.departmentSlug)}
                  </h3>
                  <ul className="m-0 flex list-none flex-col p-0">
                    {department.items.map((item) => (
                      <ShoppingListRow key={item.label} item={item} marks={marks} />
                    ))}
                  </ul>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/**
 * Per-store subtotal of the priced (on-offer) items only — explicitly not a
 * basket total, since most items on the list have no matched offer at all.
 * Each store gets its own line rather than one combined figure, since the
 * same item can price differently (or not at all) at each.
 */
function StoreTotals({ totals }: { totals: ShoppingListStoreTotal[] }) {
  return (
    <ul className="m-0 flex list-none flex-col gap-0.5 p-0 text-xs text-muted">
      {totals.map((storeTotal) => (
        <li key={storeTotal.storeId}>
          {t("shoppingList.storeTotal", {
            store: STORE_NAMES[storeTotal.storeId],
            total: `${storeTotal.total} ${storeTotal.currencyCode}`,
            count: storeTotal.itemCount,
          })}
        </li>
      ))}
    </ul>
  );
}

/**
 * The matched offer's price, next to the "on offer" tag — the cheapest of
 * the item's per-store prices, since that's the store-agnostic figure most
 * useful at a glance. When more than one store has it, that's flagged
 * rather than silently picking one store's price and implying it's the only
 * option (the per-store breakdown lives in `StoreTotals`).
 */
function PriceBadge({ prices }: { prices: ShoppingListItemPrice[] }) {
  const cheapest = prices.reduce((min, p) => (p.price < min.price ? p : min), prices[0]!);
  return (
    <span className="ml-1 text-xs text-muted">
      {prices.length > 1
        ? t("shoppingList.priceFrom", { price: `${cheapest.price} ${cheapest.currencyCode}` })
        : `${cheapest.price} ${cheapest.currencyCode}`}
    </span>
  );
}

/**
 * One line, in one of three states: still to buy, in the trolley, or already
 * at home.
 *
 * The tick box and the "we've got some" toggle are separate controls rather
 * than one cycling button, because the two mean opposite things to whoever
 * reads the list next — bought it vs. don't buy it — and a control that
 * cycles through both would make the wrong one a mistap away. Marking one
 * clears the other: they can't both be true.
 *
 * The toggle sits outside the `<label>`, not inside it: a button nested in a
 * label would also toggle the checkbox it belongs to.
 */
function ShoppingListRow({ item, marks }: { item: ShoppingListItem; marks: ShoppingListMarks }) {
  const status = marks.marks.get(item.label);
  const inTrolley = status === "checked";
  const atHome = status === "at_home";

  return (
    <li className="flex items-start gap-2 border-b border-divider last:border-0">
      {/* `min-w-0` all the way down: an ingredient line can be one long
          unbreakable word, and without it the row's min-content width is that
          word's, which pushes the whole page sideways. */}
      <label className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-start gap-3 py-2">
        <input
          type="checkbox"
          checked={inTrolley}
          onChange={() => marks.toggleMark(item.label, "checked")}
          className="mt-1 h-5 w-5 shrink-0 accent-accent"
        />
        <span className="min-w-0 flex-1">
          <span
            className={`block text-sm ${inTrolley ? "text-muted line-through" : ""} ${
              // Not struck through: nothing was bought, and it should stay
              // easy to read when someone checks whether it's really there.
              atHome ? "text-muted italic" : ""
            }`}
          >
            {item.label}
            {/* No "at home" badge here: the toggle on the right is already
                pressed and filled, and saying it twice on one line is noise.
                What separates the two marks at a glance is which control is
                lit — the tick box or the toggle. */}
            {item.offerNames.length > 0 && !atHome && (
              <>
                {" "}
                <Tag variant="accent">{t("recipeDetail.onOfferBadge")}</Tag>
                {item.prices.length > 0 && <PriceBadge prices={item.prices} />}
              </>
            )}
          </span>
          <span className="block text-xs text-muted">
            {item.dates.map(weekdayOf).join(", ")}
            {item.variants.length > 1 && ` · ${item.variants.slice(1).join(", ")}`}
          </span>
        </span>
      </label>

      <button
        type="button"
        aria-pressed={atHome}
        aria-label={t("shoppingList.atHomeAria", { item: item.label })}
        onClick={() => marks.toggleMark(item.label, "at_home")}
        className={`my-1 min-h-11 shrink-0 self-start rounded-md border px-3.5 text-xs font-semibold transition-colors ${
          atHome
            ? "border-accent bg-accent text-white"
            : "border-divider text-muted hover:bg-neutral-100"
        }`}
      >
        {t("shoppingList.atHome")}
      </button>
    </li>
  );
}

/**
 * One line under the count saying how the marks are travelling.
 *
 * Silent when everything has landed, which is nearly always. It speaks up for
 * the two states that change what the person should believe: marks still
 * waiting for a connection (they're safe, they just aren't shared yet) and a
 * mark the server refused (the screen and the family's list disagree).
 */
function SyncStatus({ marks }: { marks: ShoppingListMarks }) {
  if (marks.saveFailed) {
    return <p className="m-0 text-xs text-red-700">{t("shoppingList.syncFailed")}</p>;
  }
  if (marks.pendingCount > 0) {
    return (
      <p className="m-0 text-xs text-muted">
        {t("shoppingList.syncPending", { count: marks.pendingCount })}
      </p>
    );
  }
  return <p className="m-0 text-xs text-muted">{t("shoppingList.sharedWithFamily")}</p>;
}
