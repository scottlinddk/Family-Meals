import type { DayPlan, ExternalRecipe, WeekPlan } from "~/domain/types";
import type { PlanShare } from "~/data/repositories/planShareRepository";
import { weekPlanRepository } from "~/data/repositories/weekPlanRepository";
import { externalRecipeRepository } from "~/data/repositories/externalRecipeRepository";
import { familyRepository } from "~/data/repositories/familyRepository";
import { weekStartDateOf } from "~/domain/sharing/shareTarget";

/**
 * What a `/share/{token}` link resolves to, in the shape the public page
 * renders. One discriminated union rather than three endpoints: the token
 * decides which arm comes back, and the caller has no say in it.
 *
 * Every arm's payload can be null. A link outliving what it points at is
 * normal — the week hasn't been generated yet, the day was swapped out of the
 * plan, the recipe cache was replaced by a re-scrape — and that is a
 * different thing to say than "this link is dead", which is what a 404 means
 * here.
 */
export type SharedPlan =
  | { kind: "week"; familyName: string | null; weekStartDate: string; week: WeekPlan | null }
  | {
      kind: "day";
      familyName: string | null;
      weekStartDate: string;
      date: string;
      day: DayPlan | null;
    }
  | { kind: "recipe"; familyName: string | null; recipe: ExternalRecipe | null };

/**
 * Resolves a share to what it currently points at.
 *
 * Computed fresh on every request, like the ICS feed and unlike a snapshot:
 * the link shares the family's plan, not a copy taken when the link was made,
 * so a dish swapped on Tuesday shows up for whoever is holding the link too.
 */
export async function resolveSharedPlan(share: PlanShare): Promise<SharedPlan> {
  const family = await familyRepository.getById(share.familyId);
  const familyName = family?.name ?? null;

  if (share.target.kind === "recipe") {
    const recipe = await externalRecipeRepository.getById(share.target.recipeId);
    return { kind: "recipe", familyName, recipe: recipe ?? null };
  }

  const weekStartDate = weekStartDateOf(share.target)!;
  const week = await weekPlanRepository.getWeekPlan(share.familyId, weekStartDate);

  if (share.target.kind === "week") {
    return { kind: "week", familyName, weekStartDate, week: week ?? null };
  }

  const date = share.target.date;
  return {
    kind: "day",
    familyName,
    weekStartDate,
    date,
    day: week?.days.find((day) => day.date === date) ?? null,
  };
}
