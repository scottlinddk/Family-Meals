import type { ExternalRecipe, Offer } from "~/domain/types";
import {
  rankExternalRecipesByOffers,
  type MatchedIngredient,
} from "~/domain/recipes/externalRecipeMatch";
import { estimateRecipeCalories, type CalorieEstimate } from "~/domain/recipes/calorieEstimate";
import { assessVegetarian, type VegetarianAssessment } from "~/domain/recipes/vegetarian";

/**
 * Which meals to suggest, out of the ~350 dinners REMA publishes.
 *
 * The old ranking asked one question — how many of this recipe's ingredients
 * are on offer this week — and answered it well. It just isn't the only
 * question the family asks. The three that actually decide dinner are:
 *
 *   1. what's cheap this week (offer overlap),
 *   2. what's light (calories per serving),
 *   3. what's meat-free.
 *
 * So each recipe is scored on all three and the *weights* change, rather than
 * the ranking being swapped out: sorting by calories still prefers a cheap
 * light dinner over an expensive one, and `balanced` — the default — is the
 * only mode that lets all three speak. Vegetarian is both a scoring
 * component and a hard filter, because "meat-free-ish" is not a thing anyone
 * wants for dinner: when it's asked for, it's a requirement.
 *
 * The two signals that don't exist in the source data are computed:
 * `calorieEstimate.ts` reads calories off the ingredient lines, and
 * `vegetarian.ts` reads meat off them. Both are honest about being estimates,
 * and both are only ever used *comparatively* here.
 */

export type SuggestionSort = "balanced" | "offers" | "calories";

export const SUGGESTION_SORTS: SuggestionSort[] = ["balanced", "offers", "calories"];

export function isSuggestionSort(value: unknown): value is SuggestionSort {
  return typeof value === "string" && (SUGGESTION_SORTS as string[]).includes(value);
}

export interface RankedSuggestion {
  recipe: ExternalRecipe;
  /** Number of the recipe's ingredients that are on offer. */
  offerScore: number;
  /** Share of the recipe's ingredients that are on offer, 0–1. */
  offerCoverage: number;
  matchedIngredients: MatchedIngredient[];
  matchedOfferNames: string[];
  /** Subset of `matchedOfferNames` that only run part of the week (see `offerTiming.ts`). */
  weekendOnlyOfferNames: string[];
  /** Null when the recipe has no ingredient list to estimate from. */
  calories: CalorieEstimate | null;
  vegetarian: VegetarianAssessment;
  /** The 0–1 composite this list is sorted by. */
  score: number;
  /** The composite's three parts, each 0–1, before weighting. */
  components: { offers: number; calories: number; vegetarian: number };
}

/**
 * How much each signal counts, per mode.
 *
 * `offers` and `calories` keep a little of the other signals rather than
 * zeroing them: two recipes whose offer overlap is identical — and with 91
 * offers against 350 recipes, ties are the common case, not the exception —
 * should be separated by something the family cares about rather than by
 * whichever the database returned first.
 */
const WEIGHTS: Record<SuggestionSort, { offers: number; calories: number; vegetarian: number }> = {
  balanced: { offers: 0.5, calories: 0.3, vegetarian: 0.2 },
  offers: { offers: 0.85, calories: 0.1, vegetarian: 0.05 },
  calories: { offers: 0.15, calories: 0.8, vegetarian: 0.05 },
};

export interface SuggestionOptions {
  sort?: SuggestionSort;
  /** Drops everything with meat in it, rather than merely ranking it lower. */
  vegetarianOnly?: boolean;
  /** How many suggestions to return. The full 350 is a scroll, not a suggestion. */
  limit?: number;
}

/**
 * Calories, as a 0–1 "lighter is better" score by *rank* within the candidate
 * set rather than by min-max scaling.
 *
 * Min-max would let one 6000 kcal celebration roast compress every ordinary
 * dinner into the top few percent of the range, where they'd be
 * indistinguishable. Rank has no such outlier sensitivity, and the only thing
 * this number is for is putting recipes in order against each other.
 */
function caloriePercentiles(perServing: (number | null)[]): number[] {
  const known = perServing
    .map((kcal, index) => ({ kcal, index }))
    .filter((entry): entry is { kcal: number; index: number } => entry.kcal !== null)
    .sort((a, b) => a.kcal - b.kcal);

  const scores = new Array(perServing.length).fill(0);
  known.forEach((entry, rank) => {
    // Lightest gets 1, heaviest 0. A single known recipe is trivially the lightest.
    scores[entry.index] = known.length === 1 ? 1 : 1 - rank / (known.length - 1);
  });
  // Recipes with no estimate keep 0: an unestimatable recipe has no ingredient
  // list, so it isn't a dinner anyone can cook from either way.
  return scores;
}

/**
 * Ranks REMA's recipes for the "best meals this week" panel.
 *
 * Every recipe is scored on all three signals; `sort` only changes what they
 * weigh, and `vegetarianOnly` removes rather than demotes. Ties break on the
 * raw offer count, then on calories, then on title — so the same offers and
 * the same recipes always produce the same list, which a randomly-ordered
 * "best meals" panel would not.
 */
export function rankRecipeSuggestions(
  recipes: ExternalRecipe[],
  offers: Offer[],
  { sort = "balanced", vegetarianOnly = false, limit }: SuggestionOptions = {},
): RankedSuggestion[] {
  const byOffers = rankExternalRecipesByOffers(recipes, offers);

  const candidates = byOffers
    .map((ranked) => ({
      ranked,
      calories: estimateRecipeCalories(ranked.recipe),
      vegetarian: assessVegetarian(ranked.recipe),
    }))
    .filter((candidate) => !vegetarianOnly || candidate.vegetarian.vegetarian);

  const maxOfferScore = Math.max(0, ...candidates.map((candidate) => candidate.ranked.score));
  const calorieScores = caloriePercentiles(
    candidates.map((candidate) => candidate.calories?.perServingKcal ?? null),
  );
  const weights = WEIGHTS[sort];

  const ranked = candidates.map((candidate, index): RankedSuggestion => {
    const { ranked: offerMatch, calories, vegetarian } = candidate;

    /*
     * Offer overlap folds the two numbers the offer matcher produces: how
     * many ingredients are discounted (against the best any recipe managed
     * this week) and what share of the shop that is. Count leads, because
     * three discounted ingredients save more money than one; coverage
     * follows, so between two recipes with three, the shorter one — where
     * those three are more of the total shop — comes first.
     */
    const offersComponent =
      maxOfferScore === 0 ? 0 : 0.7 * (offerMatch.score / maxOfferScore) + 0.3 * offerMatch.coverage;

    const components = {
      offers: offersComponent,
      calories: calorieScores[index]!,
      vegetarian: vegetarian.vegetarian ? 1 : 0,
    };

    return {
      recipe: offerMatch.recipe,
      offerScore: offerMatch.score,
      offerCoverage: offerMatch.coverage,
      matchedIngredients: offerMatch.matchedIngredients,
      matchedOfferNames: offerMatch.matchedOfferNames,
      weekendOnlyOfferNames: offerMatch.weekendOnlyOfferNames,
      calories,
      vegetarian,
      score:
        weights.offers * components.offers +
        weights.calories * components.calories +
        weights.vegetarian * components.vegetarian,
      components,
    };
  });

  ranked.sort(
    (a, b) =>
      b.score - a.score ||
      b.offerScore - a.offerScore ||
      (a.calories?.perServingKcal ?? Infinity) - (b.calories?.perServingKcal ?? Infinity) ||
      a.recipe.title.localeCompare(b.recipe.title),
  );

  return limit === undefined ? ranked : ranked.slice(0, limit);
}
