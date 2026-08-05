import type { Route } from "./+types/api.weeks.$weekStart.shopping-list.share";
import { requireFamilyMembership } from "~/lib/auth";
import { shoppingListShareRepository } from "~/data/repositories/shoppingListShareRepository";
import {
  isMissingSchemaError,
  SCHEMA_OUT_OF_DATE_BODY,
  SCHEMA_OUT_OF_DATE_STATUS,
} from "~/lib/dbErrors";

/** GET: the live `/list/{token}` link for this week, or `{ token: null }`. */
export async function loader({ request, params }: Route.LoaderArgs) {
  const headers = new Headers();
  const { family } = await requireFamilyMembership(request, headers);
  const jsonHeaders = { ...Object.fromEntries(headers), "Content-Type": "application/json" };

  try {
    const share = await shoppingListShareRepository.getActive(family.id, params.weekStart!);
    return new Response(JSON.stringify({ token: share?.token ?? null }), { headers: jsonHeaders });
  } catch (error) {
    if (!isMissingSchemaError(error)) throw error;
    console.error("Shopping list sharing hit an out-of-date database schema:", error);
    return new Response(SCHEMA_OUT_OF_DATE_BODY, {
      status: SCHEMA_OUT_OF_DATE_STATUS,
      headers: jsonHeaders,
    });
  }
}

/**
 * POST issues the week's share link (reusing the live one if there is one, so
 * pressing "share" again doesn't kill the link already sitting in someone's
 * messages); DELETE revokes it.
 */
export async function action({ request, params }: Route.ActionArgs) {
  const headers = new Headers();
  const { family, userId } = await requireFamilyMembership(request, headers);
  const jsonHeaders = { ...Object.fromEntries(headers), "Content-Type": "application/json" };
  const weekStart = params.weekStart!;

  try {
    if (request.method === "DELETE") {
      await shoppingListShareRepository.revokeAll(family.id, weekStart);
      return new Response(JSON.stringify({ token: null }), { headers: jsonHeaders });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: Object.fromEntries(headers) });
    }

    const share = await shoppingListShareRepository.getOrCreate(family.id, weekStart, userId);
    return new Response(JSON.stringify({ token: share.token }), { headers: jsonHeaders });
  } catch (error) {
    if (!isMissingSchemaError(error)) throw error;
    console.error("Shopping list sharing hit an out-of-date database schema:", error);
    return new Response(SCHEMA_OUT_OF_DATE_BODY, {
      status: SCHEMA_OUT_OF_DATE_STATUS,
      headers: jsonHeaders,
    });
  }
}
