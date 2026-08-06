import type { Route } from "./+types/api.shared.$token";
import { planShareRepository } from "~/data/repositories/planShareRepository";
import { resolveSharedPlan } from "~/lib/sharedPlan";
import {
  isMissingSchemaError,
  SCHEMA_OUT_OF_DATE_BODY,
  SCHEMA_OUT_OF_DATE_STATUS,
} from "~/lib/dbErrors";

/**
 * The week, day or recipe behind a `/share/{token}` link.
 *
 * Authenticated by the opaque token alone — same bearer-URL model as the ICS
 * feed and the shopping-list link, and the same reason: the person the plan
 * was sent to has no account here. The token decides the family *and* what is
 * served, so nothing about the answer comes from the caller.
 *
 * There is no action beside this loader, deliberately: unlike the shopping
 * list — where the ticks are the shared part and a read-only copy would leave
 * everyone else's list wrong — a plan someone was sent to look at is not a
 * plan they should be able to change.
 *
 * `Cache-Control: private, no-store` keeps it out of shared caches, since the
 * URL is the credential.
 */
export async function loader({ params }: Route.LoaderArgs) {
  const jsonHeaders = {
    "Content-Type": "application/json",
    "Cache-Control": "private, no-store",
  };

  try {
    const share = await planShareRepository.getActiveByToken(params.token!);
    if (!share) {
      return new Response(JSON.stringify({ error: "not_found" }), { status: 404, headers: jsonHeaders });
    }

    return new Response(JSON.stringify(await resolveSharedPlan(share)), { headers: jsonHeaders });
  } catch (error) {
    if (!isMissingSchemaError(error)) throw error;
    console.error("A shared link hit an out-of-date database schema:", error);
    return new Response(SCHEMA_OUT_OF_DATE_BODY, {
      status: SCHEMA_OUT_OF_DATE_STATUS,
      headers: jsonHeaders,
    });
  }
}
