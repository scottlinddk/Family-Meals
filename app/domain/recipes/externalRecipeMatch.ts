import type { ExternalRecipe, Offer } from "~/domain/types";
import { ingredientMatchKey, offersMatchingIngredient } from "~/domain/recipes/ingredientOfferScore";
import { isWeekendOnlyOffer } from "~/domain/offers/offerTiming";

/**
 * One recipe ingredient line the matcher found at least one real offer for.
 *
 * Stays in the list even after every name in `offerNames` has been flagged
 * away as a wrong match — the ingredient itself didn't stop being part of
 * the recipe just because this week's offer for it turned out to be wrong.
 * Only an ingredient the matcher never found *any* offer for is left out
 * entirely (see `rankExternalRecipesByOffers`).
 */
export interface MatchedIngredient {
  /** The recipe's own ingredient line, verbatim, so the UI can highlight it. */
  ingredient: string;
  /** Offer names currently covering it — empty once every match has been flagged as wrong. */
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

/**
 * How a flagged ingredient↔offer pairing is identified, both when the loader
 * reads a family's flags and when a match is tested against them.
 *
 * Both sides are reduced to what the match was actually made on: the
 * ingredient to its product identity (see `ingredientMatchKey`, so flagging
 * "1 stk squash" also covers the recipes saying "2 stk squash"), and the offer
 * name to its case-insensitive form, since the same product comes back
 * differently capitalised from one week's import to the next.
 *
 * The separator stays a NUL because both sides are free text containing
 * spaces, which would otherwise let two different pairings collide into one
 * key.
 */
export function offerOverrideKey(ingredientLabel: string, offerName: string): string {
  return `${ingredientMatchKey(ingredientLabel)}\0${offerName.trim().toLowerCase()}`;
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
  /** Pairs (see `offerOverrideKey`) a family has flagged as wrong; dropped before scoring. */
  excludedPairs?: ReadonlySet<string>,
): RankedExternalRecipe[] {
  return recipes
    .map((recipe) => {
      const matchedIngredients: MatchedIngredient[] = [];
      const matchedOfferNames = new Set<string>();
      const weekendOnlyOfferNames = new Set<string>();

      for (const ingredient of recipe.ingredients) {
        const allMatches = offersMatchingIngredient(ingredient, offers);
        // An ingredient nothing was ever on offer for isn't part of this
        // list at all — only a *flagged-away* match leaves the row behind
        // with no offers, which is what the filter below is for.
        if (allMatches.length === 0) continue;

        const matches = excludedPairs
          ? allMatches.filter((offer) => !excludedPairs.has(offerOverrideKey(ingredient, offer.name)))
          : allMatches;

        for (const offer of matches) {
          matchedOfferNames.add(offer.name);
          if (isWeekendOnlyOffer(offer)) weekendOnlyOfferNames.add(offer.name);
        }

        matchedIngredients.push({
          ingredient,
          // Deduplicated: the same product is imported once per snapshot and
          // per selected store, so an unfiltered list shows the shopper the
          // same offer name two or three times over.
          offerNames: [...new Set(matches.map((offer) => offer.name))],
          weekendOnlyOfferNames: [
            ...new Set(matches.filter(isWeekendOnlyOffer).map((offer) => offer.name)),
          ],
          price: matches.length > 0 ? Math.min(...matches.map((offer) => offer.price)) : undefined,
        });
      }

      // Scored on ingredients that are *currently* on offer — a flagged-away
      // match keeps its row for display but must not keep inflating the
      // ranking a wrong match earned the recipe in the first place.
      const onOfferCount = matchedIngredients.filter((match) => match.offerNames.length > 0).length;

      return {
        recipe,
        score: onOfferCount,
        coverage: recipe.ingredients.length > 0 ? onOfferCount / recipe.ingredients.length : 0,
        matchedIngredients,
        matchedOfferNames: [...matchedOfferNames],
        weekendOnlyOfferNames: [...weekendOnlyOfferNames],
      };
    })
    .sort((a, b) => b.score - a.score || b.coverage - a.coverage);
}
