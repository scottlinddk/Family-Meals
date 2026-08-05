import type { Route } from "./+types/api.weeks.$weekStart.shopping-list.marks";
import { requireFamilyMembership } from "~/lib/auth";
import { shoppingListMarkRepository } from "~/data/repositories/shoppingListMarkRepository";
import { parseItemStatus } from "~/domain/planning/shoppingListMarks";
import {
  isMissingSchemaError,
  SCHEMA_OUT_OF_DATE_BODY,
  SCHEMA_OUT_OF_DATE_STATUS,
} from "~/lib/dbErrors";

/**
 * Which lines of a week's shopping list the family has marked, and how — in
 * the trolley, or already at home.
 *
 * Kept separate from the list itself: the list is derived from the plan and
 * the week's offers and changes about never, while the marks change every few
 * seconds in a shop and are polled to keep two shoppers in sync. Splitting
 * them means that polling costs one small query instead of rebuilding the
 * whole list each time.
 */
export async function loader({ request, params }: Route.LoaderArgs) {
  const headers = new Headers();
  const { family } = await requireFamilyMembership(request, headers);
  const jsonHeaders = { ...Object.fromEntries(headers), "Content-Type": "application/json" };

  try {
    const marks = await shoppingListMarkRepository.listMarks(family.id, params.weekStart!);
    return new Response(JSON.stringify({ marks }), { headers: jsonHeaders });
  } catch (error) {
    if (!isMissingSchemaError(error)) throw error;
    console.error("Shopping list marks hit an out-of-date database schema:", error);
    return new Response(SCHEMA_OUT_OF_DATE_BODY, {
      status: SCHEMA_OUT_OF_DATE_STATUS,
      headers: jsonHeaders,
    });
  }
}

/**
 * POST `{ label, status }` marks one line (`status: null` unmarks it); DELETE
 * `{ labels? }` empties the week, optionally narrowed to the lines the caller
 * could see. Both answer with the family's whole resulting set of marks, so a
 * phone that has been offline catches up on everyone else's in the same round
 * trip.
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
      await shoppingListMarkRepository.clear(family.id, weekStart, labels);
      const marks = await shoppingListMarkRepository.listMarks(family.id, weekStart);
      return new Response(JSON.stringify({ marks }), { headers: jsonHeaders });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: Object.fromEntries(headers) });
    }

    const body = await request.json().catch(() => ({}));
    const label = typeof body.label === "string" ? body.label : "";
    const status = parseItemStatus(body.status);
    if (!label || status === undefined) {
      return new Response(JSON.stringify({ error: "label and a valid status are required" }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const marks = await shoppingListMarkRepository.setMark(
      family.id,
      weekStart,
      label,
      status,
      userId,
    );
    return new Response(JSON.stringify({ marks }), { headers: jsonHeaders });
  } catch (error) {
    if (!isMissingSchemaError(error)) throw error;
    console.error("Shopping list marks hit an out-of-date database schema:", error);
    return new Response(SCHEMA_OUT_OF_DATE_BODY, {
      status: SCHEMA_OUT_OF_DATE_STATUS,
      headers: jsonHeaders,
    });
  }
}
