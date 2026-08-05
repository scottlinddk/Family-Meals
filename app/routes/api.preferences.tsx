import type { Route } from "./+types/api.preferences";
import { requireUser } from "~/lib/auth";
import { userPreferenceRepository } from "~/data/repositories/userPreferenceRepository";
import { DEFAULT_USER_PREFERENCES, parseCookViewMode } from "~/domain/preferences";
import {
  isMissingSchemaError,
  SCHEMA_OUT_OF_DATE_BODY,
  SCHEMA_OUT_OF_DATE_STATUS,
} from "~/lib/dbErrors";

function json(body: unknown, headers: Headers, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...Object.fromEntries(headers), "Content-Type": "application/json" },
  });
}

/**
 * GET: the signed-in user's view preferences.
 *
 * A database that hasn't had the migration run yet answers with the defaults
 * rather than an error: an unsaved preference and an unreachable one are the
 * same thing to the page asking, and cook mode must open either way. Saving
 * (below) does report the problem, since there the difference matters.
 */
export async function loader({ request }: Route.LoaderArgs) {
  const headers = new Headers();
  const user = await requireUser(request, headers);
  if (!user) return new Response("Unauthorized", { status: 401 });

  try {
    return json(await userPreferenceRepository.get(user.id), headers);
  } catch (error) {
    if (isMissingSchemaError(error)) return json(DEFAULT_USER_PREFERENCES, headers);
    throw error;
  }
}

/** PATCH: change one or more of the signed-in user's view preferences. */
export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "PATCH") {
    return new Response("Method not allowed", { status: 405 });
  }

  const headers = new Headers();
  const user = await requireUser(request, headers);
  if (!user) return new Response("Unauthorized", { status: 401 });

  const body = await request.json().catch(() => ({}));
  const cookViewMode = parseCookViewMode(body.cookViewMode);
  if (!cookViewMode) {
    return json({ error: "invalid_cook_view_mode" }, headers, 400);
  }

  try {
    return json(await userPreferenceRepository.setCookViewMode(user.id, cookViewMode), headers);
  } catch (error) {
    if (isMissingSchemaError(error)) {
      return new Response(SCHEMA_OUT_OF_DATE_BODY, {
        status: SCHEMA_OUT_OF_DATE_STATUS,
        headers: { "Content-Type": "application/json" },
      });
    }
    throw error;
  }
}
