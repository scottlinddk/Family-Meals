import type { DayPlan, ExternalRecipe, Offer, WeekPlan } from "~/domain/types";
import { deriveUncuratedAdultVariant, deriveUncuratedChildVariant } from "~/domain/recipes/variantDerivation";
import { rankExternalRecipesByOffers } from "~/domain/recipes/externalRecipeMatch";
import { toRecipeSnapshot } from "~/domain/recipes/recipeSnapshot";

function toDayPlan(recipe: ExternalRecipe, existing: DayPlan, now: string, offers: Offer[]): DayPlan {
  return {
    ...existing,
    baseRecipeId: recipe.id,
    recipeSnapshot: toRecipeSnapshot(recipe, offers),
    adultVariant: deriveUncuratedAdultVariant(recipe.id),
    childVariant: deriveUncuratedChildVariant(recipe.id),
    isManualOverride: true,
    editedAt: now,
    sequence: existing.sequence + 1,
  };
}

/**
 * Regenerates a single day's recipe pick, avoiding every recipe already
 * used elsewhere in the week (so regenerating Tuesday doesn't ignore what's
 * already planned Mon/Wed-Sun) as well as the day's current recipe.
 */
export function regenerateDay(week: WeekPlan, dayIndex: number, offers: Offer[], externalRecipes: ExternalRecipe[]): WeekPlan {
  const existing = week.days[dayIndex];
  if (!existing) {
    throw new Error(`Day index ${dayIndex} is out of range for a 7-day week plan.`);
  }

  const usedElsewhere = new Set(
    week.days.filter((_, index) => index !== dayIndex).map((day) => day.baseRecipeId),
  );
  const candidates = externalRecipes.filter((recipe) => recipe.id !== existing.baseRecipeId);
  const ranked = rankExternalRecipesByOffers(candidates, offers).map((r) => r.recipe);

  const unused = ranked.find((recipe) => !usedElsewhere.has(recipe.id));
  const chosen = unused ?? ranked[0];
  if (!chosen) {
    throw new Error("No alternative recipe available to regenerate this day.");
  }

  const now = new Date().toISOString();
  const days = week.days.map((day, index) =>
    index === dayIndex ? toDayPlan(chosen, existing, now, offers) : day,
  );

  return { ...week, days, updatedAt: now };
}

/** Manually swaps a day to a specific recipe id, chosen by the user rather than the generator. */
export function swapDayRecipe(
  week: WeekPlan,
  dayIndex: number,
  recipeId: string,
  externalRecipes: ExternalRecipe[],
  offers: Offer[] = [],
): WeekPlan {
  const existing = week.days[dayIndex];
  if (!existing) {
    throw new Error(`Day index ${dayIndex} is out of range for a 7-day week plan.`);
  }

  const recipe = externalRecipes.find((r) => r.id === recipeId);
  if (!recipe) {
    throw new Error(`Unknown recipe id "${recipeId}".`);
  }

  const now = new Date().toISOString();
  const days = week.days.map((day, index) =>
    index === dayIndex ? toDayPlan(recipe, existing, now, offers) : day,
  );

  return { ...week, days, updatedAt: now };
}
