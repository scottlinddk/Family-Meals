import type { Route } from "./+types/weeks.$weekStart.shopping-list";
import { useShoppingList } from "~/ui/hooks/useShoppingList";
import { useShoppingListMarks } from "~/ui/hooks/useShoppingListMarks";
import { ShoppingListView } from "~/ui/components/ShoppingListView";
import { ShareListPanel } from "~/ui/components/ShareListPanel";
import { Button } from "~/ui/components/ui/Button";
import { BackLink } from "~/ui/components/ui/BackLink";
import { t } from "~/i18n/t";
import { SchemaOutOfDateError } from "~/lib/dbErrors";

export default function ShoppingListPage({ params }: Route.ComponentProps) {
  const weekStart = params.weekStart!;
  const list = useShoppingList(weekStart);
  const marks = useShoppingListMarks({ kind: "week", weekStart });

  return (
    <>
      <BackLink to={`/weeks/${weekStart}`}>{t("day.backToWeek")}</BackLink>

      <div className="mt-2 mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="m-0 min-w-0 text-2xl">{t("shoppingList.title")}</h1>
        {list.data && list.data.itemCount > 0 && <ShareListPanel weekStart={weekStart} />}
      </div>

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

      {list.data && list.data.itemCount > 0 && <ShoppingListView list={list.data} marks={marks} />}
    </>
  );
}
