import type { Route } from "./+types/api.shares";
import { requireFamilyMembership } from "~/lib/auth";
import { planShareRepository } from "~/data/repositories/planShareRepository";
import { parseShareTarget } from "~/domain/sharing/shareTarget";
import {
  isMissingSchemaError,
  SCHEMA_OUT_OF_DATE_BODY,
  SCHEMA_OUT_OF_DATE_STATUS,
} from "~/lib/dbErrors";

/**
 * Issuing and revoking the read-only `/share/{token}` links, for all three
 * things worth sending: a week, a day, a recipe.
 *
 * One endpoint rather than three, because the target is data — see
 * `ShareTarget` — and nothing about issuing a link differs between the kinds.
 * The family always comes from the session, never from the request, so this
 * can only ever share something the caller can already see.
 */
export async function loader({ request }: Route.LoaderArgs) {
  const headers = new Headers();
  const { family } = await requireFamilyMembership(request, headers);
  const jsonHeaders = { ...Object.fromEntries(headers), "Content-Type": "application/json" };

  const url = new URL(request.url);
  const target = parseShareTarget({
    kind: url.searchParams.get("kind"),
    weekStartDate: url.searchParams.get("weekStartDate"),
    date: url.searchParams.get("date"),
    recipeId: url.searchParams.get("recipeId"),
  });
  if (!target) {
    return new Response(JSON.stringify({ error: "invalid_target" }), { status: 400, headers: jsonHeaders });
  }

  try {
    const share = await planShareRepository.getActive(family.id, target);
    return new Response(JSON.stringify({ token: share?.token ?? null }), { headers: jsonHeaders });
  } catch (error) {
    return schemaErrorResponse(error, jsonHeaders);
  }
}

/**
 * POST issues the link (reusing the live one, so pressing "share" twice
 * doesn't kill the link already sent); DELETE revokes it.
 */
export async function action({ request }: Route.ActionArgs) {
  const headers = new Headers();
  const { family, userId } = await requireFamilyMembership(request, headers);
  const jsonHeaders = { ...Object.fromEntries(headers), "Content-Type": "application/json" };

  if (request.method !== "POST" && request.method !== "DELETE") {
    return new Response("Method not allowed", { status: 405, headers: Object.fromEntries(headers) });
  }

  const body = await request.json().catch(() => ({}));
  const target = parseShareTarget(body);
  if (!target) {
    return new Response(JSON.stringify({ error: "invalid_target" }), { status: 400, headers: jsonHeaders });
  }

  try {
    if (request.method === "DELETE") {
      await planShareRepository.revokeAll(family.id, target);
      return new Response(JSON.stringify({ token: null }), { headers: jsonHeaders });
    }

    const share = await planShareRepository.getOrCreate(family.id, target, userId);
    return new Response(JSON.stringify({ token: share.token }), { headers: jsonHeaders });
  } catch (error) {
    return schemaErrorResponse(error, jsonHeaders);
  }
}

/** Code deploys ahead of `npm run db:migrate` here — see `dbErrors.ts`. */
function schemaErrorResponse(error: unknown, jsonHeaders: Record<string, string>): Response {
  if (!isMissingSchemaError(error)) throw error;
  console.error("Sharing hit an out-of-date database schema:", error);
  return new Response(SCHEMA_OUT_OF_DATE_BODY, {
    status: SCHEMA_OUT_OF_DATE_STATUS,
    headers: jsonHeaders,
  });
}
