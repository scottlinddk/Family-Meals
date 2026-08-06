import type { Route } from "./+types/api.recipes.$id";
import { requireUser } from "~/lib/auth";
import { externalRecipeRepository } from "~/data/repositories/externalRecipeRepository";
import { nutritionFactRepository } from "~/data/repositories/nutritionFactRepository";
import { computeRecipeNutrition } from "~/domain/nutrition/recipeNutrition";

/**
 * GET: a single REMA 1000 recipe by id (404 if not cached), with what it puts
 * on a plate.
 *
 * The nutrition rides along with the recipe rather than sitting behind its own
 * request: it is derived from the recipe's own ingredient lines, so a page
 * showing one without the other would be showing half a recipe.
 */
export async function loader({ request, params }: Route.LoaderArgs) {
  const headers = new Headers();
  const user = await requireUser(request, headers);
  if (!user) throw new Response("Unauthorized", { status: 401 });

  const recipe = await externalRecipeRepository.getById(params.id!);
  if (!recipe) throw new Response("Not found", { status: 404 });

  const lookup = await nutritionFactRepository.loadLookup();
  const nutrition = computeRecipeNutrition(recipe, { lookup });

  return new Response(JSON.stringify({ ...recipe, nutrition }), {
    headers: { ...Object.fromEntries(headers), "Content-Type": "application/json" },
  });
}
