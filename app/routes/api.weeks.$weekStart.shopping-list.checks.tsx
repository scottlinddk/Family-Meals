import type { Route } from "./+types/api.weeks.$weekStart.shopping-list.checks";
import { requireFamilyMembership } from "~/lib/auth";
import { shoppingListCheckRepository } from "~/data/repositories/shoppingListCheckRepository";
import {
  isMissingSchemaError,
  SCHEMA_OUT_OF_DATE_BODY,
  SCHEMA_OUT_OF_DATE_STATUS,
} from "~/lib/dbErrors";

/**
 * Which lines of a week's shopping list the family has already picked up.
 *
 * Kept separate from the list itself: the list is derived from the plan and
 * the week's offers and changes about never, while the ticks change every few
 * seconds in a shop and are polled to keep two shoppers in sync. Splitting
 * them means that polling costs one small query instead of rebuilding the
 * whole list each time.
 */
export async function loader({ request, params }: Route.LoaderArgs) {
  const headers = new Headers();
  const { family } = await requireFamilyMembership(request, headers);
  const jsonHeaders = { ...Object.fromEntries(headers), "Content-Type": "application/json" };

  try {
    const checkedLabels = await shoppingListCheckRepository.listChecked(family.id, params.weekStart!);
    return new Response(JSON.stringify({ checkedLabels }), { headers: jsonHeaders });
  } catch (error) {
    if (!isMissingSchemaError(error)) throw error;
    console.error("Shopping list checks hit an out-of-date database schema:", error);
    return new Response(SCHEMA_OUT_OF_DATE_BODY, {
      status: SCHEMA_OUT_OF_DATE_STATUS,
      headers: jsonHeaders,
    });
  }
}

/**
 * POST `{ label, checked }` ticks or unticks one line; DELETE `{ labels? }`
 * empties the week (optionally narrowed to the lines the caller could see).
 * Both answer with the family's whole resulting set, so a phone that has been
 * offline catches up on everyone else's ticks in the same round trip.
 */
export async function action({ request, params }: Route.ActionArgs) {
  const headers = new Headers();
  const { family, userId } = await requireFamilyMembership(request, headers);
  const jsonHeaders = { ...Object.fromEntries(headers), "Content-Type": "application/json" };
  const weekStart = params.weekStart!;

  try {
    if (request.method === "DELETE") {
      const body = await request.json().catch(() => ({}));
      const labels = Array.isArray(body.labels)
        ? body.labels.filter((label: unknown): label is string => typeof label === "string")
        : undefined;
      await shoppingListCheckRepository.clear(family.id, weekStart, labels);
      const checkedLabels = await shoppingListCheckRepository.listChecked(family.id, weekStart);
      return new Response(JSON.stringify({ checkedLabels }), { headers: jsonHeaders });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: Object.fromEntries(headers) });
    }

    const body = await request.json().catch(() => ({}));
    const label = typeof body.label === "string" ? body.label : "";
    if (!label) {
      return new Response(JSON.stringify({ error: "label is required" }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const checkedLabels = await shoppingListCheckRepository.setChecked(
      family.id,
      weekStart,
      label,
      body.checked !== false,
      userId,
    );
    return new Response(JSON.stringify({ checkedLabels }), { headers: jsonHeaders });
  } catch (error) {
    if (!isMissingSchemaError(error)) throw error;
    console.error("Shopping list checks hit an out-of-date database schema:", error);
    return new Response(SCHEMA_OUT_OF_DATE_BODY, {
      status: SCHEMA_OUT_OF_DATE_STATUS,
      headers: jsonHeaders,
    });
  }
}
