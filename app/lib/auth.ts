import { createServerClient, parseCookieHeader, serializeCookieHeader } from "@supabase/ssr";
import type { SetAllCookies } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { db } from "~/data/db/client";
import { familyRepository, familyToDomain, type Family } from "~/data/repositories/familyRepository";
import { familyMemberRepository, type FamilyMember } from "~/data/repositories/familyMemberRepository";
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
 * Cookie remembering which of the signed-in user's (possibly several)
 * families is currently "active" — i.e. which one their meal plan, offers,
 * and family-settings pages operate on.
 */
const ACTIVE_FAMILY_COOKIE = "active_family_id";

function getRequestedFamilyId(request: Request): string | undefined {
  return parseCookieHeader(request.headers.get("Cookie") ?? "").find(
    (cookie) => cookie.name === ACTIVE_FAMILY_COOKIE,
  )?.value;
}

export function setActiveFamilyCookie(headers: Headers, familyId: string) {
  headers.append(
    "Set-Cookie",
    serializeCookieHeader(ACTIVE_FAMILY_COOKIE, familyId, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    }),
  );
}

/**
 * Resolves the signed-in user's *active* family and their user id, creating
 * a family (and an "owner" membership row) on first login. A user can
 * belong to several families at once (one they created, plus any they've
 * joined via invite links); the active one is whichever the
 * `active_family_id` cookie points at, falling back to their first
 * membership. A family can have several members sharing the same meal plan.
 * Throws a 401 Response if not signed in.
 */
export async function requireFamilyMembership(
  request: Request,
  headers: Headers,
): Promise<{ family: Family; userId: string; memberships: FamilyMember[] }> {
  const user = await requireUser(request, headers);
  if (!user) {
    throw new Response("Unauthorized", { status: 401 });
  }

  const memberships = await familyMemberRepository.getMembershipsForUser(user.id);
  if (memberships.length > 0) {
    const requestedFamilyId = getRequestedFamilyId(request);
    const active = memberships.find((m) => m.familyId === requestedFamilyId) ?? memberships[0]!;
    const family = await familyRepository.getById(active.familyId);
    if (family) {
      if (active.familyId !== requestedFamilyId) setActiveFamilyCookie(headers, active.familyId);
      return { family, userId: user.id, memberships };
    }
  }

  const { family, membership } = await db.transaction(async (tx) => {
    const [familyRow] = await tx
      .insert(families)
      .values({ ownerUserId: user.id, calendarToken: generateCalendarToken() })
      .returning();
    const [memberRow] = await tx
      .insert(familyMembers)
      .values({ familyId: familyRow!.id, userId: user.id, role: "owner" })
      .returning();
    return { family: familyToDomain(familyRow!), membership: memberRow! };
  });
  setActiveFamilyCookie(headers, family.id);
  return {
    family,
    userId: user.id,
    memberships: [
      { id: membership.id, familyId: membership.familyId, userId: membership.userId, role: membership.role, joinedAt: membership.joinedAt.toISOString() },
    ],
  };
}

/** Resolves the signed-in user's active family, creating one on first login (see `requireFamilyMembership`). */
export async function requireFamily(request: Request, headers: Headers): Promise<Family> {
  const { family } = await requireFamilyMembership(request, headers);
  return family;
}

/**
 * Switches the signed-in user's active family to `familyId`, provided
 * they're actually a member of it. Returns false (and leaves the active
 * family untouched) if they're not.
 */
export async function switchActiveFamily(request: Request, headers: Headers, familyId: string): Promise<boolean> {
  const user = await requireUser(request, headers);
  if (!user) {
    throw new Response("Unauthorized", { status: 401 });
  }
  const membership = await familyMemberRepository.getMembership(familyId, user.id);
  if (!membership) return false;
  setActiveFamilyCookie(headers, familyId);
  return true;
}
