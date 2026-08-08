import type { Nutrients } from "~/domain/nutrition/nutrients";

/** What a nutrition database knows about one food. */
export interface FoodNutrition {
  /** The source's own id for the food, kept so a figure can be traced back. */
  foodId: string;
  /** The name the source matched, which is not always the term searched for. */
  foodName: string;
  /**
   * Which phrasing actually found it — the Danish term or the English retry.
   * Recorded in the cache so a surprising figure can be traced to the question
   * that produced it, not just to the answer.
   */
  query: string;
  /** Figures per 100 g, normalised from whatever serving the source stated. */
  per100g: Nutrients;
}

/**
 * What to ask a nutrition database about one product.
 *
 * Two phrasings rather than one, because the app asks in Danish and the
 * databases are not all Danish: `query` is the Danish product word, which is
 * what a localised FatSecret key answers best, and `fallbackQuery` is the
 * English name to retry with when it finds nothing. The caller decides the
 * words; the source decides whether the retry is worth making.
 */
export interface NutritionQuery {
  query: string;
  fallbackQuery?: string;
}

/**
 * Swappable seam for nutrition databases, mirroring `OfferSource` and
 * `RecipeSource`.
 *
 * `lookup` returns null for "this source has nothing usable for that term" —
 * no match in either phrasing, or a match with no metric serving to scale
 * from. That is an ordinary answer rather than an error, and the caller caches
 * it as one so a term that FatSecret doesn't know isn't asked about again
 * every week. Network and credential failures throw, because those are worth
 * retrying.
 */
export interface NutritionSource {
  lookup(term: NutritionQuery): Promise<FoodNutrition | null>;
}
