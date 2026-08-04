import type { ExternalRecipe, Offer, RecipeSnapshot } from "~/domain/types";
import { offersMatchingIngredient } from "~/domain/recipes/ingredientOfferScore";

/**
 * Builds the denormalized `RecipeSnapshot` stored on a `DayPlan`.
 *
 * The snapshot carries everything the day card and day page need to show the
 * meal *in the app* — summary, timing, ingredients and method — so the plan
 * stays readable without a round trip to REMA's site. `url` is still kept so
 * the original page is always one click away.
 *
 * Offer matches are resolved here, at generation time, rather than when
 * rendering: a week plan is generated against one week's offer snapshot, so
 * freezing "what was on offer when this was planned" alongside it keeps the
 * card honest after the offers roll over.
 */
export function toRecipeSnapshot(recipe: ExternalRecipe, offers: Offer[] = []): RecipeSnapshot {
  return {
    title: recipe.title,
    source: "external",
    url: recipe.url,
    imageUrl: recipe.imageUrl,
    description: recipe.description,
    servings: recipe.servings,
    totalTimeMinutes: recipe.totalTimeMinutes,
    tags: [],
    ingredientLines: recipe.ingredients,
    instructionLines: recipe.instructions,
    offerIngredientLines: recipe.ingredients.filter(
      (ingredient) => offersMatchingIngredient(ingredient, offers).length > 0,
    ),
  };
}
