import { describe, expect, it } from "vitest";
import type { ExternalRecipe } from "~/domain/types";
import { generateWeekPlan } from "~/domain/planning/generateWeekPlan";
import { regenerateDay } from "~/domain/planning/regenerateDay";
import { buildIcsFeed } from "~/domain/calendar/icsBuilder";
import { buildEventUid } from "~/domain/calendar/uid";

function fixtureRecipes(count: number): ExternalRecipe[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `recipe-${i}`,
    title: `Recipe ${i}`,
    url: `https://madogdrikke.rema1000.dk/opskrifter/recipe-${i}`,
    ingredients: [`Ingredient ${i}`],
  }));
}

describe("regenerateDay", () => {
  it("bumps sequence and keeps the same VEVENT UID after regenerating a day", () => {
    const externalRecipes = fixtureRecipes(10);
    const week = generateWeekPlan({
      familyId: "family-1",
      weekStartDate: "2026-08-03",
      offers: [],
      offerSnapshotId: "snapshot-1",
      externalRecipes,
    });

    const originalRecipeId = week.days[2]!.baseRecipeId;
    const updated = regenerateDay(week, 2, [], externalRecipes);

    expect(updated.days[2]!.baseRecipeId).not.toBe(originalRecipeId);
    expect(updated.days[2]!.sequence).toBe(week.days[2]!.sequence + 1);

    const icsBefore = buildIcsFeed(week);
    const icsAfter = buildIcsFeed(updated);
    const expectedUid = buildEventUid({
      familyId: "family-1",
      date: week.days[2]!.date,
      mealSlot: "dinner",
    });

    expect(icsBefore).toContain(expectedUid);
    expect(icsAfter).toContain(expectedUid);
  });

  it("never repeats the same recipe across a 7-day plan when enough recipes are available", () => {
    const externalRecipes = fixtureRecipes(10);
    const week = generateWeekPlan({
      familyId: "family-1",
      weekStartDate: "2026-08-03",
      offers: [],
      offerSnapshotId: "snapshot-1",
      externalRecipes,
    });

    const ids = week.days.map((day) => day.baseRecipeId);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
