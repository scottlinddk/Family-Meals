import type { Offer } from "~/domain/types";

/**
 * Case-insensitive substring match in both directions between an ingredient
 * name and an offer name — good enough for small, hand-picked/scraped
 * recipe lists, not intended as general-purpose product matching. Shared by
 * `offerAwareSelection` (internal recipe catalog) and `externalRecipeMatch`
 * (scraped REMA 1000 recipes).
 */
export function offersMatchingIngredient(ingredientName: string, offers: Offer[]): Offer[] {
  const name = ingredientName.toLowerCase();
  return offers.filter((offer) => {
    const offerName = offer.name.toLowerCase();
    return offerName.includes(name) || name.includes(offerName);
  });
}
