import type { ExternalRecipe } from "~/domain/types";

/** Swappable seam for external recipe catalogs (mirrors OfferSource). */
export interface RecipeSource {
  fetchRecipes(): Promise<ExternalRecipe[]>;
}
