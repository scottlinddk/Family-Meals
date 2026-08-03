import type { Route } from "./+types/api.recipes.$id.related";
import { requireUser } from "~/lib/auth";
import { getRecipeById } from "~/domain/recipes/recipeCatalog";
import { externalRecipeRepository } from "~/data/repositories/externalRecipeRepository";
import { findRelatedExternalRecipes } from "~/domain/recipes/relatedExternalRecipes";

/** GET: REMA 1000's own recipes whose ingredients overlap with the given curated recipe, ranked best-match-first. */
export async function loader({ request, params }: Route.LoaderArgs) {
  const headers = new Headers();
  const user = await requireUser(request, headers);
  if (!user) throw new Response("Unauthorized", { status: 401 });

  const entry = getRecipeById(params.id);
  if (!entry) throw new Response("Not found", { status: 404 });

  const externalRecipes = await externalRecipeRepository.listAll();
  const related = findRelatedExternalRecipes(entry.recipe, externalRecipes);

  return new Response(JSON.stringify(related), {
    headers: { ...Object.fromEntries(headers), "Content-Type": "application/json" },
  });
}
