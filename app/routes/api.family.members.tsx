import type { Route } from "./+types/api.family.members";
import { requireFamily } from "~/lib/auth";
import { familyMemberRepository } from "~/data/repositories/familyMemberRepository";

/** GET: the signed-in user's family's members (with email, for display). */
export async function loader({ request }: Route.LoaderArgs) {
  const headers = new Headers();
  const family = await requireFamily(request, headers);
  const members = await familyMemberRepository.listByFamilyWithEmail(family.id);

  return new Response(JSON.stringify(members), {
    headers: { ...Object.fromEntries(headers), "Content-Type": "application/json" },
  });
}
