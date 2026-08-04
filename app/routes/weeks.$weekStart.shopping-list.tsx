import { useMemo } from "react";
import { Link } from "react-router";
import type { Route } from "./+types/weeks.$weekStart.shopping-list";
import { useCheckedItems, useShoppingList } from "~/ui/hooks/useShoppingList";
import { Card } from "~/ui/components/ui/Card";
import { Button } from "~/ui/components/ui/Button";
import { Tag } from "~/ui/components/ui/Tag";
import { t, type TranslationKey } from "~/i18n/t";
import { SchemaOutOfDateError } from "~/lib/dbErrors";

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

export default function ShoppingListPage({ params }: Route.ComponentProps) {
  const weekStart = params.weekStart!;
  const list = useShoppingList(weekStart);
  const { checked, toggle, clear } = useCheckedItems(weekStart);

  // Counted against the list's own labels so stale ticks from a regenerated
  // week (labels that no longer appear) don't shrink the remaining count.
  const remaining = useMemo(() => {
    if (!list.data) return 0;
    return list.data.sections
      .flatMap((section) => section.items)
      .filter((item) => !checked.has(item.label)).length;
  }, [list.data, checked]);

  return (
    <>
      <Link to={`/weeks/${weekStart}`} className="text-sm text-accent hover:text-accent-700">
        {t("day.backToWeek")}
      </Link>

      <h1 className="mt-3 mb-1 text-3xl">{t("shoppingList.title")}</h1>

      {/*
        Every query state renders something. `isLoading` alone left the page
        blank below the heading whenever the fetch failed — and also before it
        started, since a query that hasn't run yet is pending but not fetching
        — which read as "the shopping list shows nothing".
      */}
      {list.isError && (
        <div className="flex flex-col items-start gap-2">
          <p className="m-0 text-sm text-red-700">
            {list.error instanceof SchemaOutOfDateError
              ? t("week.schemaOutOfDate")
              : t("shoppingList.loadFailed")}
          </p>
          {/* Retrying a schema mismatch can't help, so only offer it otherwise. */}
          {!(list.error instanceof SchemaOutOfDateError) && (
            <Button type="button" variant="secondary" size="sm" onClick={() => list.refetch()}>
              {t("shoppingList.retry")}
            </Button>
          )}
        </div>
      )}

      {!list.isError && list.data === undefined && (
        <p className="text-muted">{t("week.loading")}</p>
      )}

      {list.data === null && <p className="text-muted">{t("shoppingList.noPlan")}</p>}

      {list.data && list.data.itemCount === 0 && (
        <p className="text-muted">{t("shoppingList.empty")}</p>
      )}

      {list.data && list.data.itemCount > 0 && (
        <>
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="m-0 text-sm text-muted">
              {t("shoppingList.summary", {
                remaining,
                total: list.data.itemCount,
                onOffer: list.data.onOfferCount,
              })}
            </p>
            {checked.size > 0 && (
              <Button type="button" variant="ghost" size="sm" onClick={clear}>
                {t("shoppingList.clearChecked")}
              </Button>
            )}
          </div>

          <div className="flex flex-col gap-4">
            {list.data.sections.map((section) => (
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
                            <span
                              className={`block text-sm ${isChecked ? "text-muted line-through" : ""}`}
                            >
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
      )}
    </>
  );
}
