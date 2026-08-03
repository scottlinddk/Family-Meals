import type { Route } from "./+types/api.family.invites";
import { requireFamily, requireFamilyMembership } from "~/lib/auth";
import { familyInviteRepository } from "~/data/repositories/familyInviteRepository";

/** GET: pending invites for the signed-in user's family. */
export async function loader({ request }: Route.LoaderArgs) {
  const headers = new Headers();
  const family = await requireFamily(request, headers);
  const invites = await familyInviteRepository.listPendingByFamily(family.id);

  return new Response(JSON.stringify(invites), {
    headers: { ...Object.fromEntries(headers), "Content-Type": "application/json" },
  });
}

/** POST: invite an email address to join the signed-in user's family. */
export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const headers = new Headers();
  const { family, userId } = await requireFamilyMembership(request, headers);
  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim() : "";

  if (!email || !email.includes("@")) {
    return new Response(JSON.stringify({ error: "A valid email is required." }), {
      status: 400,
      headers: { ...Object.fromEntries(headers), "Content-Type": "application/json" },
    });
  }

  const invite = await familyInviteRepository.create(family.id, email, userId);

  return new Response(JSON.stringify(invite), {
    status: 201,
    headers: { ...Object.fromEntries(headers), "Content-Type": "application/json" },
  });
}
