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
    sourceLabel: recipe.source,
    url: recipe.url,
    imageUrl: recipe.imageUrl,
    description: recipe.description,
    servings: recipe.servings,
    totalTimeMinutes: recipe.totalTimeMinutes,
    prepTimeMinutes: recipe.prepTimeMinutes,
    cookTimeMinutes: recipe.cookTimeMinutes,
    tags: [],
    ingredientLines: recipe.ingredients,
    instructionLines: recipe.instructions,
    offerIngredientLines: recipe.ingredients.filter(
      (ingredient) => offersMatchingIngredient(ingredient, offers).length > 0,
    ),
  };
}

/**
 * Fills in the list fields a stored snapshot may be missing.
 *
 * `day_plans.recipe_snapshot` is JSONB written by more than one generation of
 * this app — migration 0003 backfilled pre-snapshot rows with a placeholder
 * carrying no `instructionLines` at all — so the arrays can't be trusted to
 * exist just because the type says they do. Everything downstream iterates
 * them (`buildShoppingList`, the ICS feed, the day page) and a missing array
 * throws there rather than at the read, which surfaces as a page rendering
 * nothing at all. Defaulting once, where the row is read, keeps that out of
 * every consumer.
 */
export function normalizeRecipeSnapshot(stored: unknown): RecipeSnapshot {
  const snapshot = (stored ?? {}) as Partial<RecipeSnapshot>;
  return {
    ...snapshot,
    title: snapshot.title ?? "",
    source: snapshot.source ?? "external",
    tags: snapshot.tags ?? [],
    ingredientLines: snapshot.ingredientLines ?? [],
    instructionLines: snapshot.instructionLines ?? [],
  };
}
