import type { Route } from "./+types/api.shopping-list.$token.checks";
import { shoppingListShareRepository } from "~/data/repositories/shoppingListShareRepository";
import { shoppingListCheckRepository } from "~/data/repositories/shoppingListCheckRepository";
import {
  isMissingSchemaError,
  SCHEMA_OUT_OF_DATE_BODY,
  SCHEMA_OUT_OF_DATE_STATUS,
} from "~/lib/dbErrors";

const jsonHeaders = {
  "Content-Type": "application/json",
  "Cache-Control": "private, no-store",
};

const NOT_FOUND = () =>
  new Response(JSON.stringify({ error: "not_found" }), { status: 404, headers: jsonHeaders });

/** GET: the ticks on the shared week, for the holder of the link. */
export async function loader({ params }: Route.LoaderArgs) {
  try {
    const share = await shoppingListShareRepository.getActiveByToken(params.token!);
    if (!share) return NOT_FOUND();

    const checkedLabels = await shoppingListCheckRepository.listChecked(
      share.familyId,
      share.weekStartDate,
    );
    return new Response(JSON.stringify({ checkedLabels }), { headers: jsonHeaders });
  } catch (error) {
    if (!isMissingSchemaError(error)) throw error;
    console.error("Shared shopping list checks hit an out-of-date database schema:", error);
    return new Response(SCHEMA_OUT_OF_DATE_BODY, { status: SCHEMA_OUT_OF_DATE_STATUS, headers: jsonHeaders });
  }
}

/**
 * POST `{ label, checked }` ticks a line off from the shared link.
 *
 * Link holders can tick, deliberately: the link exists to be sent to whoever
 * is actually in the shop, and a list they can only read would leave the
 * family's ticks wrong for everyone else. It's the *only* thing they can
 * write — the ticks the family already shares, on one week — and
 * `checkedByUserId` is left null because there's no account behind the tick.
 *
 * Clearing the whole list is not offered here: emptying someone else's list
 * is a bigger action than the link is meant to carry, and it's the one action
 * that can't be undone by looking at the shelf.
 */
export async function action({ request, params }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const share = await shoppingListShareRepository.getActiveByToken(params.token!);
    if (!share) return NOT_FOUND();

    const body = await request.json().catch(() => ({}));
    const label = typeof body.label === "string" ? body.label : "";
    if (!label) {
      return new Response(JSON.stringify({ error: "label is required" }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const checkedLabels = await shoppingListCheckRepository.setChecked(
      share.familyId,
      share.weekStartDate,
      label,
      body.checked !== false,
      null,
    );
    return new Response(JSON.stringify({ checkedLabels }), { headers: jsonHeaders });
  } catch (error) {
    if (!isMissingSchemaError(error)) throw error;
    console.error("Shared shopping list checks hit an out-of-date database schema:", error);
    return new Response(SCHEMA_OUT_OF_DATE_BODY, { status: SCHEMA_OUT_OF_DATE_STATUS, headers: jsonHeaders });
  }
}
