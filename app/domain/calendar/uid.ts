import type { MealSlot } from "~/domain/types";

/**
 * Stable, content-independent VEVENT UID. Keyed on the calendar date (not a
 * day-of-week index) and the family/meal slot only — never on recipe
 * identity — so editing/regenerating a day's dish keeps the same UID and
 * subscribing calendar apps treat it as an update, not a new/duplicate
 * event. Also makes it safe to later concatenate multiple weeks into one
 * growing feed without UID collisions.
 */
export function buildEventUid(params: {
  familyId: string;
  date: string; // ISO date, yyyy-mm-dd
  mealSlot: MealSlot;
}): string {
  return `${params.familyId}-${params.date}-${params.mealSlot}@familymeals.app`;
}
