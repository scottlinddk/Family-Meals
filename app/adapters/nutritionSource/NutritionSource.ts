import type { Nutrients } from "~/domain/nutrition/nutrients";

/** What a nutrition database knows about one food. */
export interface FoodNutrition {
  /** The source's own id for the food, kept so a figure can be traced back. */
  foodId: string;
  /** The name the source matched, which is not always the term searched for. */
  foodName: string;
  /** Figures per 100 g, normalised from whatever serving the source stated. */
  per100g: Nutrients;
}

/**
 * Swappable seam for nutrition databases, mirroring `OfferSource` and
 * `RecipeSource`.
 *
 * `lookup` returns null for "this source has nothing usable for that term" —
 * no match, or a match with no metric serving to scale from. That is an
 * ordinary answer rather than an error, and the caller caches it as one so a
 * term that FatSecret doesn't know isn't asked about again every week.
 * Network and credential failures throw, because those are worth retrying.
 */
export interface NutritionSource {
  lookup(term: string): Promise<FoodNutrition | null>;
}
