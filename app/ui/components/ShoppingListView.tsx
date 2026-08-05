import { useMemo } from "react";
import type { ShoppingList } from "~/domain/planning/shoppingList";
import type { ShoppingChecks } from "~/ui/hooks/useShoppingChecks";
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

/**
 * The list itself: departments, lines, tick boxes and the running count.
 *
 * Shared by the two places the same list is shopped from — the signed-in
 * week page and the `/list/{token}` share link — because they are the same
 * list, ticked into the same rows. Everything that differs between them
 * (chrome, sharing controls, who you are) lives in the pages; this component
 * only needs the list and something that knows what's ticked.
 */
export function ShoppingListView({ list, checks }: { list: ShoppingList; checks: ShoppingChecks }) {
  const { checked, toggle } = checks;

  // Counted against the list's own labels so stale ticks from a regenerated
  // week (labels that no longer appear) don't shrink the remaining count.
  const visibleLabels = useMemo(
    () => list.sections.flatMap((section) => section.items).map((item) => item.label),
    [list],
  );
  const remaining = visibleLabels.filter((label) => !checked.has(label)).length;

  return (
    <>
      <div className="mb-4 flex flex-col gap-1">
        <div className="flex items-center justify-between gap-3">
          <p className="m-0 text-sm text-muted">
            {t("shoppingList.summary", {
              remaining,
              total: list.itemCount,
              onOffer: list.onOfferCount,
            })}
          </p>
          {checks.clearSupported && checked.size > 0 && (
            <Button type="button" variant="ghost" size="sm" onClick={() => checks.clear(visibleLabels)}>
              {t("shoppingList.clearChecked")}
            </Button>
          )}
        </div>

        <SyncStatus checks={checks} />
      </div>

      <div className="flex flex-col gap-4">
        {list.sections.map((section) => (
          <Card key={section.departmentSlug ?? "other"} as="section" className="p-4">
            <h2 className="text-[11px] tracking-wide text-muted uppercase">
              {departmentLabel(section.departmentSlug)}
            </h2>
            <ul className="m-0 flex list-none flex-col p-0">
              {section.items.map((item) => {
                const isChecked = checked.has(item.label);
                return (
                  <li key={item.label} className="border-b border-divider last:border-0">
                    <label className="flex min-h-11 cursor-pointer items-start gap-3 py-2">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggle(item.label)}
                        className="mt-1 h-5 w-5 shrink-0 accent-accent"
                      />
                      <span className="min-w-0 flex-1">
                        <span className={`block text-sm ${isChecked ? "text-muted line-through" : ""}`}>
                          {item.label}
                          {item.offerNames.length > 0 && (
                            <>
                              {" "}
                              <Tag variant="accent">{t("recipeDetail.onOfferBadge")}</Tag>
                            </>
                          )}
                        </span>
                        <span className="block text-xs text-muted">
                          {item.dates.map(weekdayOf).join(", ")}
                          {item.variants.length > 1 && ` · ${item.variants.slice(1).join(", ")}`}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </Card>
        ))}
      </div>
    </>
  );
}

/**
 * One line under the count saying how the ticks are travelling.
 *
 * Silent when everything has landed, which is nearly always. It speaks up for
 * the two states that change what the person should believe: ticks still
 * waiting for a connection (they're safe, they just aren't shared yet) and a
 * tick the server refused (the screen and the family's list disagree).
 */
function SyncStatus({ checks }: { checks: ShoppingChecks }) {
  if (checks.saveFailed) {
    return <p className="m-0 text-xs text-red-700">{t("shoppingList.syncFailed")}</p>;
  }
  if (checks.pendingCount > 0) {
    return (
      <p className="m-0 text-xs text-muted">
        {t("shoppingList.syncPending", { count: checks.pendingCount })}
      </p>
    );
  }
  return <p className="m-0 text-xs text-muted">{t("shoppingList.sharedWithFamily")}</p>;
}
