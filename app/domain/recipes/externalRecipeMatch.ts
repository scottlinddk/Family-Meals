import type { ExternalRecipe, Offer } from "~/domain/types";
import { offersMatchingIngredient } from "~/domain/recipes/ingredientOfferScore";

export interface RankedExternalRecipe {
  recipe: ExternalRecipe;
  score: number;
  /** Offer names that matched at least one ingredient, for display ("on offer: ..."). */
  matchedOfferNames: string[];
}

/**
 * Cross-checks REMA 1000's own published recipes (`ExternalRecipe`, from
 * `RemaRecipeSource`) against this week's offers and ranks them
 * highest-overlap-first, so the family can pick meals REMA is already
 * suggesting that also happen to be discounted this week.
 */
export function rankExternalRecipesByOffers(
  recipes: ExternalRecipe[],
  offers: Offer[],
): RankedExternalRecipe[] {
  return recipes
    .map((recipe) => {
      const matchedOfferNames = new Set<string>();
      for (const ingredient of recipe.ingredients) {
        for (const offer of offersMatchingIngredient(ingredient, offers)) {
          matchedOfferNames.add(offer.name);
        }
      }
      return { recipe, score: matchedOfferNames.size, matchedOfferNames: [...matchedOfferNames] };
    })
    .sort((a, b) => b.score - a.score);
}
