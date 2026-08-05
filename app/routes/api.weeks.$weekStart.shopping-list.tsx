import type { Route } from "./+types/api.weeks.$weekStart.shopping-list";
import { requireFamily } from "~/lib/auth";
import { shoppingListForWeek } from "~/lib/shoppingListForWeek";
import {
  isMissingSchemaError,
  SCHEMA_OUT_OF_DATE_BODY,
  SCHEMA_OUT_OF_DATE_STATUS,
} from "~/lib/dbErrors";

/** GET: the week's aggregated shopping list (404 if the week isn't planned yet). */
export async function loader({ request, params }: Route.LoaderArgs) {
  const headers = new Headers();
  const family = await requireFamily(request, headers);
  const jsonHeaders = { ...Object.fromEntries(headers), "Content-Type": "application/json" };

  try {
    const list = await shoppingListForWeek(family.id, params.weekStart!);
    if (!list) {
      return new Response(JSON.stringify({ error: "not_found" }), { status: 404, headers: jsonHeaders });
    }

    return new Response(JSON.stringify(list), { headers: jsonHeaders });
  } catch (error) {
    // Same failure as week generation: this reads the offer snapshot tables,
    // so a database behind the deployed code takes the list down with it.
    if (!isMissingSchemaError(error)) throw error;
    console.error("Shopping list hit an out-of-date database schema:", error);
    return new Response(SCHEMA_OUT_OF_DATE_BODY, {
      status: SCHEMA_OUT_OF_DATE_STATUS,
      headers: jsonHeaders,
    });
  }
}
