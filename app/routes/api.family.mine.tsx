import type { Route } from "./+types/api.family.mine";
import { requireFamilyMembership } from "~/lib/auth";
import { familyRepository } from "~/data/repositories/familyRepository";

/** GET: every family the signed-in user belongs to, marking which one is currently active. */
export async function loader({ request }: Route.LoaderArgs) {
  const headers = new Headers();
  const { family: activeFamily, memberships } = await requireFamilyMembership(request, headers);

  const results = await Promise.all(
    memberships.map(async (membership) => {
      const family =
        membership.familyId === activeFamily.id ? activeFamily : await familyRepository.getById(membership.familyId);
      if (!family) return null;
      return {
        id: family.id,
        name: family.name,
        role: membership.role,
        active: family.id === activeFamily.id,
      };
    }),
  );

  return new Response(JSON.stringify(results.filter((r) => r !== null)), {
    headers: { ...Object.fromEntries(headers), "Content-Type": "application/json" },
  });
}
