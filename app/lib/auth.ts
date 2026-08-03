import { createServerClient, parseCookieHeader, serializeCookieHeader } from "@supabase/ssr";
import type { SetAllCookies } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { db } from "~/data/db/client";
import { familyRepository, familyToDomain, type Family } from "~/data/repositories/familyRepository";
import { familyMemberRepository } from "~/data/repositories/familyMemberRepository";
import { families, familyMembers } from "~/data/db/schema";
import { generateCalendarToken } from "~/lib/tokens";

/**
 * Builds a request-scoped Supabase client for use in RR7 loaders/actions,
 * wiring cookie read/write through the Request/Headers objects RR7 gives us.
 * Used to gate the edit UI (weeks.*, offers.*) behind Supabase Auth
 * email/password sessions — the ICS feed route deliberately does NOT use
 * this, since it's authenticated by the separate calendar token instead
 * (see lib/tokens.ts).
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
 * Resolves the signed-in user's family and their user id, creating a family
 * (and an "owner" membership row) on first login. A user belongs to exactly
 * one family — either one they created, or one they joined via an invite
 * link — and a family can have several members sharing the same meal plan.
 * Throws a 401 Response if not signed in.
 */
export async function requireFamilyMembership(
  request: Request,
  headers: Headers,
): Promise<{ family: Family; userId: string }> {
  const user = await requireUser(request, headers);
  if (!user) {
    throw new Response("Unauthorized", { status: 401 });
  }

  const membership = await familyMemberRepository.getFirstMembershipForUser(user.id);
  if (membership) {
    const family = await familyRepository.getById(membership.familyId);
    if (family) return { family, userId: user.id };
  }

  const family = await db.transaction(async (tx) => {
    const [familyRow] = await tx
      .insert(families)
      .values({ ownerUserId: user.id, calendarToken: generateCalendarToken() })
      .returning();
    await tx.insert(familyMembers).values({ familyId: familyRow!.id, userId: user.id, role: "owner" });
    return familyToDomain(familyRow!);
  });
  return { family, userId: user.id };
}

/** Resolves the signed-in user's family, creating one on first login (see `requireFamilyMembership`). */
export async function requireFamily(request: Request, headers: Headers): Promise<Family> {
  const { family } = await requireFamilyMembership(request, headers);
  return family;
}
