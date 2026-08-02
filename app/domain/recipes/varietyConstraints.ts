import type { ProteinType } from "~/domain/types";
import type { CatalogEntry } from "~/domain/recipes/recipeCatalog";

/** Max times the same protein may appear across a 7-day plan. */
const MAX_REPEATS_PER_WEEK = 2;

export interface WeekVarietyState {
  /** proteinType -> count already placed this week. */
  proteinCounts: Partial<Record<ProteinType, number>>;
  /** Recipe id used the previous day, to block same-day-after-same-day repeats. */
  previousDayRecipeId: string | null;
}

export function createInitialVarietyState(): WeekVarietyState {
  return { proteinCounts: {}, previousDayRecipeId: null };
}

/**
 * Whether `entry` may be placed given what's already been placed this week.
 * Blocks repeating the same recipe on consecutive days and caps how many
 * times a single protein type appears across the week, so a 7-day plan
 * doesn't run the same protein every night by chance.
 */
export function isAllowedByVariety(
  entry: CatalogEntry,
  state: WeekVarietyState,
): boolean {
  if (entry.recipe.id === state.previousDayRecipeId) return false;

  const currentCount = state.proteinCounts[entry.recipe.proteinType] ?? 0;
  return currentCount < MAX_REPEATS_PER_WEEK;
}

export function recordPlacement(
  entry: CatalogEntry,
  state: WeekVarietyState,
): WeekVarietyState {
  const currentCount = state.proteinCounts[entry.recipe.proteinType] ?? 0;
  return {
    proteinCounts: {
      ...state.proteinCounts,
      [entry.recipe.proteinType]: currentCount + 1,
    },
    previousDayRecipeId: entry.recipe.id,
  };
}
