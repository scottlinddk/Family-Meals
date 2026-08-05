import type { Route } from "./+types/api.shopping-list.$token";
import { shoppingListShareRepository } from "~/data/repositories/shoppingListShareRepository";
import { familyRepository } from "~/data/repositories/familyRepository";
import { shoppingListForWeek } from "~/lib/shoppingListForWeek";
import {
  isMissingSchemaError,
  SCHEMA_OUT_OF_DATE_BODY,
  SCHEMA_OUT_OF_DATE_STATUS,
} from "~/lib/dbErrors";

/**
 * The shared week's list, for whoever holds the `/list/{token}` link.
 *
 * Authenticated by the opaque token alone — same bearer-URL model as the ICS
 * feed, and the same reason: the person shopping may well not have an
 * account. The token is the only thing the route trusts, so it decides the
 * family *and* the week; nothing about which list is served comes from the
 * caller. `Cache-Control: private, no-store` keeps the list out of shared
 * caches, since the URL is the credential.
 */
export async function loader({ params }: Route.LoaderArgs) {
  const jsonHeaders = {
    "Content-Type": "application/json",
    "Cache-Control": "private, no-store",
  };

  try {
    const share = await shoppingListShareRepository.getActiveByToken(params.token!);
    if (!share) {
      return new Response(JSON.stringify({ error: "not_found" }), { status: 404, headers: jsonHeaders });
    }

    const [family, list] = await Promise.all([
      familyRepository.getById(share.familyId),
      shoppingListForWeek(share.familyId, share.weekStartDate),
    ]);

    return new Response(
      JSON.stringify({
        weekStartDate: share.weekStartDate,
        familyName: family?.name ?? null,
        list,
      }),
      { headers: jsonHeaders },
    );
  } catch (error) {
    if (!isMissingSchemaError(error)) throw error;
    console.error("Shared shopping list hit an out-of-date database schema:", error);
    return new Response(SCHEMA_OUT_OF_DATE_BODY, {
      status: SCHEMA_OUT_OF_DATE_STATUS,
      headers: jsonHeaders,
    });
  }
}
