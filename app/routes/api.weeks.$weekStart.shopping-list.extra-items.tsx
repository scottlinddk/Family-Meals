import type { Route } from "./+types/api.weeks.$weekStart.shopping-list.extra-items";
import { requireFamilyMembership } from "~/lib/auth";
import { shoppingListExtraItemRepository } from "~/data/repositories/shoppingListExtraItemRepository";
import {
  isMissingSchemaError,
  SCHEMA_OUT_OF_DATE_BODY,
  SCHEMA_OUT_OF_DATE_STATUS,
} from "~/lib/dbErrors";

/**
 * Ingredients a family adds to one week's shopping list by hand — from a
 * recipe suggestion that isn't on the plan, say — rather than because a
 * recipe on the week calls for them. `shoppingListForWeek` merges these in;
 * this route only writes.
 *
 * POST `{ label }` adds one; DELETE with the same body removes it.
 */
export async function action({ request, params }: Route.ActionArgs) {
  const headers = new Headers();
  const { family, userId } = await requireFamilyMembership(request, headers);
  const jsonHeaders = { ...Object.fromEntries(headers), "Content-Type": "application/json" };
  const weekStart = params.weekStart!;

  if (request.method !== "POST" && request.method !== "DELETE") {
    return new Response("Method not allowed", { status: 405, headers: Object.fromEntries(headers) });
  }

  const body = await request.json().catch(() => ({}));
  const label = typeof body.label === "string" ? body.label.trim() : "";
  if (!label) {
    return new Response(JSON.stringify({ error: "label is required" }), {
      status: 400,
      headers: jsonHeaders,
    });
  }

  try {
    if (request.method === "POST") {
      await shoppingListExtraItemRepository.add(family.id, weekStart, label, userId);
    } else {
      await shoppingListExtraItemRepository.remove(family.id, weekStart, label);
    }
    return new Response(JSON.stringify({ ok: true }), { headers: jsonHeaders });
  } catch (error) {
    if (!isMissingSchemaError(error)) throw error;
    console.error("Shopping list extra items hit an out-of-date database schema:", error);
    return new Response(SCHEMA_OUT_OF_DATE_BODY, {
      status: SCHEMA_OUT_OF_DATE_STATUS,
      headers: jsonHeaders,
    });
  }
}
