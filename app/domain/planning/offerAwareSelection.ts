import type { Offer } from "~/domain/types";
import type { CatalogEntry } from "~/domain/recipes/recipeCatalog";

/**
 * Scores a recipe against this week's offers by counting how many of its
 * ingredients are named in a current offer (simple case-insensitive
 * substring match in both directions — good enough for a small, hand-picked
 * recipe catalog; not intended as general-purpose product matching).
 */
export function scoreEntryAgainstOffers(
  entry: CatalogEntry,
  offers: Offer[],
): number {
  let score = 0;
  for (const ingredient of entry.recipe.ingredients) {
    const ingredientName = ingredient.name.toLowerCase();
    const matches = offers.some((offer) => {
      const offerName = offer.name.toLowerCase();
      return offerName.includes(ingredientName) || ingredientName.includes(offerName);
    });
    if (matches) score += 1;
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
