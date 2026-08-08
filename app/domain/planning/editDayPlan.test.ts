import { describe, expect, it } from "vitest";
import type { ExternalRecipe } from "~/domain/types";
import { generateWeekPlan } from "~/domain/planning/generateWeekPlan";
import { editDayPlan } from "~/domain/planning/editDayPlan";

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

function fixtureWeek() {
  return generateWeekPlan({
    familyId: "family-1",
    weekStartDate: "2026-08-03",
    offers: [],
    offerSnapshotId: "snapshot-1",
    externalRecipes: fixtureRecipes(7),
  });
}

describe("editDayPlan", () => {
  it("sets a day's time budget without touching its recipe", () => {
    const week = fixtureWeek();
    const recipeId = week.days[1]!.baseRecipeId;

    const updated = editDayPlan(week, 1, { maxTimeMinutes: 30 });

    expect(updated.days[1]!.maxTimeMinutes).toBe(30);
    expect(updated.days[1]!.baseRecipeId).toBe(recipeId);
    expect(updated.days[1]!.sequence).toBe(week.days[1]!.sequence + 1);
  });

  it("clears a previously-set budget with null", () => {
    const week = fixtureWeek();
    const withBudget = editDayPlan(week, 1, { maxTimeMinutes: 30 });

    const cleared = editDayPlan(withBudget, 1, { maxTimeMinutes: null });

    expect(cleared.days[1]!.maxTimeMinutes).toBeUndefined();
  });

  it("leaves the budget untouched when the edit doesn't mention it", () => {
    const week = fixtureWeek();
    const withBudget = editDayPlan(week, 1, { maxTimeMinutes: 45 });

    const other = editDayPlan(withBudget, 1, { adultVariant: { portioningNotes: ["Halve the rice."] } });

    expect(other.days[1]!.maxTimeMinutes).toBe(45);
  });

  it("doesn't affect other days' budgets", () => {
    const week = fixtureWeek();
    const updated = editDayPlan(week, 1, { maxTimeMinutes: 30 });

    expect(updated.days[0]!.maxTimeMinutes).toBeUndefined();
    expect(updated.days[2]!.maxTimeMinutes).toBeUndefined();
  });
});
