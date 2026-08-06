import type { ExternalRecipe, Offer } from "~/domain/types";
import { offersMatchingIngredient } from "~/domain/recipes/ingredientOfferScore";
import { isWeekendOnlyOffer } from "~/domain/offers/offerTiming";

/** One ingredient line of a recipe that is covered by this week's offers. */
export interface MatchedIngredient {
  /** The recipe's own ingredient line, verbatim, so the UI can highlight it. */
  ingredient: string;
  /** Offer names covering it — usually one, occasionally a bundled offer. */
  offerNames: string[];
  /**
   * Subset of `offerNames` that only run part of the week (see
   * `offerTiming.ts`) — a recipe planned for Tuesday shouldn't be sold on an
   * ingredient that isn't discounted until Thursday.
   */
  weekendOnlyOfferNames: string[];
  /** Cheapest matching offer price, for showing what the saving applies to. */
  price?: number;
}

export interface RankedExternalRecipe {
  recipe: ExternalRecipe;
  /** Number of distinct recipe ingredients that are on offer. */
  score: number;
  /** Share of the recipe's ingredients that are on offer, 0–1. */
  coverage: number;
  matchedIngredients: MatchedIngredient[];
  /** Offer names that matched at least one ingredient, for display ("on offer: ..."). */
  matchedOfferNames: string[];
  /** Subset of `matchedOfferNames` that only run part of the week. */
  weekendOnlyOfferNames: string[];
}

/**
 * Cross-checks REMA 1000's own published recipes (`ExternalRecipe`, from
 * `RemaRecipeSource`) against this week's offers and ranks them
 * highest-overlap-first, so the family can pick meals REMA is already
 * suggesting that also happen to be discounted this week.
 *
 * Ranking counts *matched ingredients* rather than matched offers. Counting
 * offers over-rewarded recipes that happened to hit one of the bundled
 * multi-product offer names ("X, Y eller Z") and under-rewarded a recipe
 * where most of the shopping list is discounted. Coverage breaks ties, so
 * between two recipes with three discounted ingredients the shorter one —
 * where those three are more of the total shop — wins.
 */
export function rankExternalRecipesByOffers(
  recipes: ExternalRecipe[],
  offers: Offer[],
): RankedExternalRecipe[] {
  return recipes
    .map((recipe) => {
      const matchedIngredients: MatchedIngredient[] = [];
      const matchedOfferNames = new Set<string>();
      const weekendOnlyOfferNames = new Set<string>();

      for (const ingredient of recipe.ingredients) {
        const matches = offersMatchingIngredient(ingredient, offers);
        if (matches.length === 0) continue;

        for (const offer of matches) {
          matchedOfferNames.add(offer.name);
          if (isWeekendOnlyOffer(offer)) weekendOnlyOfferNames.add(offer.name);
        }

        matchedIngredients.push({
          ingredient,
          offerNames: matches.map((offer) => offer.name),
          weekendOnlyOfferNames: matches.filter(isWeekendOnlyOffer).map((offer) => offer.name),
          price: Math.min(...matches.map((offer) => offer.price)),
        });
      }

      return {
        recipe,
        score: matchedIngredients.length,
        coverage: recipe.ingredients.length > 0 ? matchedIngredients.length / recipe.ingredients.length : 0,
        matchedIngredients,
        matchedOfferNames: [...matchedOfferNames],
        weekendOnlyOfferNames: [...weekendOnlyOfferNames],
      };
    })
    .sort((a, b) => b.score - a.score || b.coverage - a.coverage);
}
