import type { DayPlan, ExternalRecipe, Offer, RecipeSnapshot, WeekPlan } from "~/domain/types";
import { deriveUncuratedAdultVariant, deriveUncuratedChildVariant } from "~/domain/recipes/variantDerivation";
import { rankExternalRecipesByOffers } from "~/domain/recipes/externalRecipeMatch";
import { addDays } from "~/lib/time";

export const GENERATOR_VERSION = "2.0.0";

/**
 * Picks the best available recipe for a single slot: highest offer-score
 * recipe not already used elsewhere in the week. Falls back to the
 * highest-scoring recipe that isn't literally the same as yesterday if
 * every recipe has already been used (small-pool safety net), and finally
 * to the top-ranked recipe outright.
 */
function pickRecipeForDay(
  rankedRecipes: ExternalRecipe[],
  usedRecipeIds: Set<string>,
  previousDayRecipeId: string | null,
): ExternalRecipe {
  const unused = rankedRecipes.find((recipe) => !usedRecipeIds.has(recipe.id));
  if (unused) return unused;

  const notSameAsYesterday = rankedRecipes.find((recipe) => recipe.id !== previousDayRecipeId);
  return notSameAsYesterday ?? rankedRecipes[0]!;
}

function toRecipeSnapshot(recipe: ExternalRecipe): RecipeSnapshot {
  return {
    title: recipe.title,
    source: "external",
    url: recipe.url,
    imageUrl: recipe.imageUrl,
    tags: [],
    ingredientLines: recipe.ingredients,
    instructionLines: recipe.instructions,
  };
}

function buildDayPlan(recipe: ExternalRecipe, date: string, now: string): DayPlan {
  return {
    date,
    mealSlot: "dinner",
    baseRecipeId: recipe.id,
    recipeSnapshot: toRecipeSnapshot(recipe),
    adultVariant: deriveUncuratedAdultVariant(recipe.id),
    childVariant: deriveUncuratedChildVariant(recipe.id),
    isManualOverride: false,
    editedAt: now,
    sequence: 0,
  };
}

export interface GenerateWeekPlanInput {
  familyId: string;
  weekStartDate: string; // Monday, ISO date
  offers: Offer[];
  offerSnapshotId: string;
  /** REMA 1000's own recipes (from `externalRecipeRepository`), the source for generated days. */
  externalRecipes: ExternalRecipe[];
}

export function generateWeekPlan({
  familyId,
  weekStartDate,
  offers,
  offerSnapshotId,
  externalRecipes,
}: GenerateWeekPlanInput): WeekPlan {
  if (externalRecipes.length === 0) {
    throw new Error(
      "No REMA 1000 recipes available to generate a week plan — refresh recipes from the offers page first.",
    );
  }

  const rankedRecipes = rankExternalRecipesByOffers(externalRecipes, offers).map((ranked) => ranked.recipe);
  const now = new Date().toISOString();

  const usedRecipeIds = new Set<string>();
  let previousDayRecipeId: string | null = null;
  const days: DayPlan[] = [];

  for (let i = 0; i < 7; i++) {
    const date = addDays(weekStartDate, i);
    const recipe = pickRecipeForDay(rankedRecipes, usedRecipeIds, previousDayRecipeId);
    days.push(buildDayPlan(recipe, date, now));
    usedRecipeIds.add(recipe.id);
    previousDayRecipeId = recipe.id;
  }

  return {
    familyId,
    weekStartDate,
    days,
    generatedFrom: { offerSnapshotId, generatorVersion: GENERATOR_VERSION },
    createdAt: now,
    updatedAt: now,
  };
}
