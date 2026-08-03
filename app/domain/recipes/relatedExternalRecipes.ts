import type { BaseRecipe, ExternalRecipe } from "~/domain/types";

export interface RankedRelatedRecipe {
  recipe: ExternalRecipe;
  score: number;
}

/** Case-insensitive substring match in both directions, same heuristic as `offersMatchingIngredient`. */
function ingredientsOverlap(a: string, b: string): boolean {
  const an = a.toLowerCase();
  const bn = b.toLowerCase();
  return an.includes(bn) || bn.includes(an);
}

/**
 * Finds REMA 1000's own recipes (`ExternalRecipe`, from `RemaRecipeSource`)
 * whose ingredients overlap with a hand-authored `BaseRecipe`, so a recipe's
 * detail view can link out to REMA's matching recipe pages. Ranked
 * highest-overlap-first; recipes with no overlap are excluded.
 */
export function findRelatedExternalRecipes(
  baseRecipe: BaseRecipe,
  externalRecipes: ExternalRecipe[],
  limit = 5,
): RankedRelatedRecipe[] {
  return externalRecipes
    .map((recipe) => {
      let score = 0;
      for (const ingredient of baseRecipe.ingredients) {
        if (recipe.ingredients.some((ext) => ingredientsOverlap(ingredient.name, ext))) score += 1;
      }
      return { recipe, score };
    })
    .filter((ranked) => ranked.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
