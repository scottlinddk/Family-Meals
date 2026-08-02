import type { Route } from "./+types/api.recipes.suggestions";
import { requireFamily } from "~/lib/auth";
import { offerRepository } from "~/data/repositories/offerRepository";
import { externalRecipeRepository } from "~/data/repositories/externalRecipeRepository";
import { rankExternalRecipesByOffers } from "~/domain/recipes/externalRecipeMatch";

/** GET: REMA 1000's own recipes ranked by how much they overlap with this week's imported offers. */
export async function loader({ request }: Route.LoaderArgs) {
  const headers = new Headers();
  await requireFamily(request, headers);

  const [offers, recipes] = await Promise.all([
    offerRepository.listCurrentOffers(),
    externalRecipeRepository.listAll(),
  ]);

  const ranked = rankExternalRecipesByOffers(recipes, offers);

  return new Response(JSON.stringify(ranked), {
    headers: { ...Object.fromEntries(headers), "Content-Type": "application/json" },
  });
}
