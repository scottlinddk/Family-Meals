import type { Route } from "./+types/api.family.invites.$id.revoke";
import { requireFamily } from "~/lib/auth";
import { familyInviteRepository } from "~/data/repositories/familyInviteRepository";

/** POST: revoke a pending invite for the signed-in user's family. */
export async function action({ request, params }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const headers = new Headers();
  const family = await requireFamily(request, headers);
  await familyInviteRepository.revoke(params.id!, family.id);

  return new Response(null, { status: 204, headers });
}
