import type { Route } from "./+types/list.$token";
import { useSharedShoppingList } from "~/ui/hooks/useShoppingList";
import { useShoppingListMarks } from "~/ui/hooks/useShoppingListMarks";
import { ShoppingListView } from "~/ui/components/ShoppingListView";
import { SchemaOutOfDateError } from "~/lib/dbErrors";
import { t } from "~/i18n/t";

/**
 * A week's shopping list, opened from the link a family member sent.
 *
 * No sign-in, no nav, no rest of the app: the person holding this link is
 * standing in a shop, and the only thing they need is the list and the
 * ability to mark it as they go — ticked into the trolley, or "we've got some
 * of that at home" after the phone call — which writes to the same rows the
 * family sees at home. Everything else the app can do stays behind the
 * account.
 */
export default function SharedShoppingListPage({ params }: Route.ComponentProps) {
  const token = params.token!;
  const shared = useSharedShoppingList(token);
  const marks = useShoppingListMarks({ kind: "share", token });

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
      <header className="mb-4">
        <p className="m-0 text-sm text-muted">
          {shared.data?.familyName ?? t("app.title")}
        </p>
        <h1 className="m-0 mt-1 text-3xl">{t("shoppingList.title")}</h1>
        {shared.data && (
          <p className="m-0 mt-1 text-sm text-muted">
            {t("week.heading", { date: shared.data.weekStartDate })}
          </p>
        )}
      </header>

      {shared.isError && (
        <p className="text-sm text-red-700">
          {shared.error instanceof SchemaOutOfDateError
            ? t("week.schemaOutOfDate")
            : t("shoppingList.loadFailed")}
        </p>
      )}

      {!shared.isError && shared.data === undefined && (
        <p className="text-muted">{t("week.loading")}</p>
      )}

      {/* Unknown or revoked token. Said plainly — a link that was taken back
          is not an error the holder can do anything about. */}
      {shared.data === null && <p className="text-muted">{t("shoppingList.shareNotFound")}</p>}

      {shared.data && shared.data.list === null && (
        <p className="text-muted">{t("shoppingList.noPlan")}</p>
      )}

      {shared.data?.list && shared.data.list.itemCount === 0 && (
        <p className="text-muted">{t("shoppingList.empty")}</p>
      )}

      {shared.data?.list && shared.data.list.itemCount > 0 && (
        <ShoppingListView list={shared.data.list} marks={marks} />
      )}
    </main>
  );
}
