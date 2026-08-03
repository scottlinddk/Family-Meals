import type { Route } from "./+types/api.family.invites.$token.accept";
import { requireUser, setActiveFamilyCookie } from "~/lib/auth";
import { familyInviteRepository } from "~/data/repositories/familyInviteRepository";
import { familyMemberRepository } from "~/data/repositories/familyMemberRepository";

/**
 * POST: accept a family invite by its token, joining that family in
 * addition to any others the user already belongs to. Deliberately does NOT
 * go through `requireFamily` — that would auto-provision a brand new family
 * for the invited user before they get a chance to join the inviting one.
 */
export async function action({ request, params }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const headers = new Headers();
  const user = await requireUser(request, headers);
  if (!user) {
    return new Response(JSON.stringify({ error: "Sign in first." }), {
      status: 401,
      headers: { ...Object.fromEntries(headers), "Content-Type": "application/json" },
    });
  }

  const jsonHeaders = { ...Object.fromEntries(headers), "Content-Type": "application/json" };
  const invite = await familyInviteRepository.getByToken(params.token!);
  if (!invite) {
    return new Response(JSON.stringify({ error: "Invite not found." }), { status: 404, headers: jsonHeaders });
  }
  if (invite.status === "revoked") {
    return new Response(JSON.stringify({ error: "This invite has been revoked." }), {
      status: 400,
      headers: jsonHeaders,
    });
  }
  if (new Date(invite.expiresAt) < new Date()) {
    return new Response(JSON.stringify({ error: "This invite has expired." }), { status: 400, headers: jsonHeaders });
  }

  const existingMembership = await familyMemberRepository.getMembership(invite.familyId, user.id);

  if (invite.status === "pending") {
    await familyInviteRepository.markAccepted(invite.id);
  }
  if (!existingMembership) {
    await familyMemberRepository.addMember(invite.familyId, user.id, "member");
  }

  // Make the newly-joined family the active one so the user lands there next.
  setActiveFamilyCookie(headers, invite.familyId);

  return new Response(JSON.stringify({ familyId: invite.familyId }), {
    headers: { ...Object.fromEntries(headers), "Content-Type": "application/json" },
  });
}
