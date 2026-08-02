import { createServerClient, parseCookieHeader, serializeCookieHeader } from "@supabase/ssr";
import type { SetAllCookies } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { familyRepository } from "~/data/repositories/familyRepository";

/**
 * Builds a request-scoped Supabase client for use in RR7 loaders/actions,
 * wiring cookie read/write through the Request/Headers objects RR7 gives us.
 * Used to gate the edit UI (weeks.*, offers.*) behind Supabase Auth magic-link
 * sessions — the ICS feed route deliberately does NOT use this, since it's
 * authenticated by the separate calendar token instead (see lib/tokens.ts).
 */
export function createSupabaseServerClient(request: Request, headers: Headers): SupabaseClient {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY must be set. See .env.example.");
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return parseCookieHeader(request.headers.get("Cookie") ?? "");
      },
      setAll(cookiesToSet: Parameters<SetAllCookies>[0]) {
        for (const { name, value, options } of cookiesToSet) {
          headers.append("Set-Cookie", serializeCookieHeader(name, value, options));
        }
      },
    },
  });
}

/** Loads the current session's user, or null if not signed in. */
export async function requireUser(request: Request, headers: Headers) {
  const supabase = createSupabaseServerClient(request, headers);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Resolves the signed-in user's family, creating one on first login (this
 * is a single-family personal app, not a multi-tenant product — one
 * Supabase user maps to exactly one family). Throws a 401 Response if not
 * signed in, so callers can just `await requireFamily(...)` in a loader/action.
 */
export async function requireFamily(request: Request, headers: Headers) {
  const user = await requireUser(request, headers);
  if (!user) {
    throw new Response("Unauthorized", { status: 401 });
  }

  const existing = await familyRepository.getByOwnerUserId(user.id);
  return existing ?? familyRepository.createFamily(user.id);
}
