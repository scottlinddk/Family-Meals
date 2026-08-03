import type { AdultVariant, ChildVariant, WeekPlan } from "~/domain/types";

export interface DayPlanEdit {
  adultVariant?: Partial<Pick<AdultVariant, "substitutions" | "portioningNotes">>;
  childVariant?: Partial<Pick<ChildVariant, "additions" | "textureNotes" | "saltSugarNotes">>;
}

/**
 * Applies a manual edit to one day's variant details (e.g. tweaking
 * portioning notes or the child's calorie-dense addition) without changing
 * which base recipe the day uses — for that, use swapDayRecipe instead.
 * Bumps `sequence`/`editedAt` like every other mutation, so the ICS feed
 * reflects the edit as an update rather than silently going stale.
 */
export function editDayPlan(week: WeekPlan, dayIndex: number, edit: DayPlanEdit): WeekPlan {
  const existing = week.days[dayIndex];
  if (!existing) {
    throw new Error(`Day index ${dayIndex} is out of range for a 7-day week plan.`);
  }

  if (existing.childVariant.curated && edit.childVariant?.additions?.length === 0) {
    throw new Error(
      "Cannot remove all of the child's calorie-dense additions — the toddler's calories must " +
        "never be reduced by the adults' calorie-cutting. Edit the addition instead of clearing it.",
    );
  }

  const now = new Date().toISOString();
  const days = week.days.map((day, index) => {
    if (index !== dayIndex) return day;
    return {
      ...day,
      adultVariant: { ...day.adultVariant, ...edit.adultVariant },
      childVariant: { ...day.childVariant, ...edit.childVariant },
      isManualOverride: true,
      editedAt: now,
      sequence: day.sequence + 1,
    };
  });

  return { ...week, days, updatedAt: now };
}
