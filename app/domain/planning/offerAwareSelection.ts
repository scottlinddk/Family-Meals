import type { Offer } from "~/domain/types";
import type { CatalogEntry } from "~/domain/recipes/recipeCatalog";
import { offersMatchingIngredient } from "~/domain/recipes/ingredientOfferScore";

/**
 * Scores a recipe against this week's offers by counting how many of its
 * ingredients are named in a current offer.
 */
export function scoreEntryAgainstOffers(
  entry: CatalogEntry,
  offers: Offer[],
): number {
  let score = 0;
  for (const ingredient of entry.recipe.ingredients) {
    if (offersMatchingIngredient(ingredient.name, offers).length > 0) score += 1;
  }
  return score;
}

/** Ranks catalog entries highest-scoring-first, stable for equal scores. */
export function rankEntriesByOffers(
  entries: CatalogEntry[],
  offers: Offer[],
): CatalogEntry[] {
  return entries
    .map((entry) => ({ entry, score: scoreEntryAgainstOffers(entry, offers) }))
    .sort((a, b) => b.score - a.score)
    .map(({ entry }) => entry);
}
