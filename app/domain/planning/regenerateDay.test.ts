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
    source: "rema1000",
    url: `https://madogdrikke.rema1000.dk/opskrifter/recipe-${i}`,
    ingredients: [`Ingredient ${i}`],
    instructions: [`Step for recipe ${i}`],
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

  it("only offers recipes fitting the day's time budget, when one is set", () => {
    const externalRecipes = fixtureRecipes(10).map((recipe, i) => ({
      ...recipe,
      totalTimeMinutes: i < 3 ? 20 : 90,
    }));
    const week = generateWeekPlan({
      familyId: "family-1",
      weekStartDate: "2026-08-03",
      offers: [],
      offerSnapshotId: "snapshot-1",
      externalRecipes,
    });

    const withBudget: typeof week = {
      ...week,
      days: week.days.map((day, i) => (i === 2 ? { ...day, maxTimeMinutes: 30 } : day)),
    };

    const updated = regenerateDay(withBudget, 2, [], externalRecipes);
    const chosen = externalRecipes.find((r) => r.id === updated.days[2]!.baseRecipeId)!;
    expect(chosen.totalTimeMinutes).toBeLessThanOrEqual(30);
  });

  it("falls back to the full candidate list when nothing fits the day's time budget", () => {
    const externalRecipes = fixtureRecipes(4).map((recipe) => ({ ...recipe, totalTimeMinutes: 90 }));
    const week = generateWeekPlan({
      familyId: "family-1",
      weekStartDate: "2026-08-03",
      offers: [],
      offerSnapshotId: "snapshot-1",
      externalRecipes,
    });

    const withBudget: typeof week = {
      ...week,
      days: week.days.map((day, i) => (i === 2 ? { ...day, maxTimeMinutes: 10 } : day)),
    };

    const updated = regenerateDay(withBudget, 2, [], externalRecipes);
    expect(updated.days[2]!.baseRecipeId).not.toBe(week.days[2]!.baseRecipeId);
  });
});
