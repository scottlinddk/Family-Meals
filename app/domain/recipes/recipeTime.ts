import type { ExternalRecipe } from "~/domain/types";

/**
 * The figure a "how long will this take" budget should be checked against:
 * prep + cook when the source split them out (the more honest number, since
 * a 10-minute prep before a 2-hour braise is not "10 minutes to make"),
 * falling back to `totalTimeMinutes` when it didn't. `undefined` when the
 * source gave no timing at all.
 */
export function totalPrepCookMinutes(
  recipe: Pick<ExternalRecipe, "prepTimeMinutes" | "cookTimeMinutes" | "totalTimeMinutes">,
): number | undefined {
  const { prepTimeMinutes, cookTimeMinutes, totalTimeMinutes } = recipe;
  if (prepTimeMinutes !== undefined || cookTimeMinutes !== undefined) {
    return (prepTimeMinutes ?? 0) + (cookTimeMinutes ?? 0);
  }
  return totalTimeMinutes;
}

/** Whether a recipe fits a day's time budget. A recipe with no timing at all never fits a stated budget. */
export function fitsTimeBudget(
  recipe: Pick<ExternalRecipe, "prepTimeMinutes" | "cookTimeMinutes" | "totalTimeMinutes">,
  maxMinutes: number | undefined,
): boolean {
  if (maxMinutes === undefined) return true;
  const minutes = totalPrepCookMinutes(recipe);
  return minutes !== undefined && minutes <= maxMinutes;
}
