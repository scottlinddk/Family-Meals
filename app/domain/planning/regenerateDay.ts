import type { DayPlan, Offer, WeekPlan } from "~/domain/types";
import { RECIPE_CATALOG, getRecipeById, type CatalogEntry } from "~/domain/recipes/recipeCatalog";
import { deriveAdultVariant, deriveChildVariant } from "~/domain/recipes/variantDerivation";
import {
  createInitialVarietyState,
  isAllowedByVariety,
  recordPlacement,
  type WeekVarietyState,
} from "~/domain/recipes/varietyConstraints";
import { rankEntriesByOffers } from "~/domain/planning/offerAwareSelection";

/** Rebuilds variety state from every day in the week except the one being replaced. */
function varietyStateExcludingDay(week: WeekPlan, dayIndex: number): WeekVarietyState {
  let state = createInitialVarietyState();
  week.days.forEach((day, index) => {
    if (index === dayIndex) return;
    const entry = getRecipeById(day.baseRecipeId);
    if (entry) state = recordPlacement(entry, state);
  });
  return state;
}

function toDayPlan(entry: CatalogEntry, existing: DayPlan, now: string): DayPlan {
  return {
    ...existing,
    baseRecipeId: entry.recipe.id,
    adultVariant: deriveAdultVariant(entry),
    childVariant: deriveChildVariant(entry),
    isManualOverride: true,
    editedAt: now,
    sequence: existing.sequence + 1,
  };
}

/**
 * Regenerates a single day's recipe pick, respecting the rest of the week's
 * variety state (so regenerating Tuesday doesn't ignore what's already
 * planned Mon/Wed-Sun). Excludes the day's current recipe from the pool so
 * "regenerate" always produces a different dish.
 */
export function regenerateDay(week: WeekPlan, dayIndex: number, offers: Offer[]): WeekPlan {
  const existing = week.days[dayIndex];
  if (!existing) {
    throw new Error(`Day index ${dayIndex} is out of range for a 7-day week plan.`);
  }

  const state = varietyStateExcludingDay(week, dayIndex);
  const candidates = RECIPE_CATALOG.filter((entry) => entry.recipe.id !== existing.baseRecipeId);
  const ranked = rankEntriesByOffers(candidates, offers);

  const allowed = ranked.find((entry) => isAllowedByVariety(entry, state));
  const chosen = allowed ?? ranked[0];
  if (!chosen) {
    throw new Error("No alternative recipe available to regenerate this day.");
  }

  const now = new Date().toISOString();
  const days = week.days.map((day, index) =>
    index === dayIndex ? toDayPlan(chosen, existing, now) : day,
  );

  return { ...week, days, updatedAt: now };
}

/** Manually swaps a day to a specific recipe id, chosen by the user rather than the generator. */
export function swapDayRecipe(week: WeekPlan, dayIndex: number, recipeId: string): WeekPlan {
  const existing = week.days[dayIndex];
  if (!existing) {
    throw new Error(`Day index ${dayIndex} is out of range for a 7-day week plan.`);
  }

  const entry = getRecipeById(recipeId);
  if (!entry) {
    throw new Error(`Unknown recipe id "${recipeId}".`);
  }

  const now = new Date().toISOString();
  const days = week.days.map((day, index) =>
    index === dayIndex ? toDayPlan(entry, existing, now) : day,
  );

  return { ...week, days, updatedAt: now };
}
