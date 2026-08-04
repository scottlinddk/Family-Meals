import { describe, expect, it } from "vitest";
import type { ExternalRecipe, Offer } from "~/domain/types";
import { generateWeekPlan } from "~/domain/planning/generateWeekPlan";

function fixtureRecipes(count: number): ExternalRecipe[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `recipe-${i}`,
    title: `Recipe ${i}`,
    url: `https://madogdrikke.rema1000.dk/opskrifter/recipe-${i}`,
    ingredients: [`Ingredient ${i}`],
    instructions: [`Step for recipe ${i}`],
  }));
}

const baseInput = {
  familyId: "family-1",
  weekStartDate: "2026-08-03",
  offers: [] as Offer[],
  offerSnapshotId: "snapshot-1" as string | null,
};

/** Deterministic stand-in for Math.random: always picks the pool's first entry. */
const alwaysFirst = () => 0;

describe("generateWeekPlan", () => {
  it("carries each day's ICS sequence forward from the plan it replaces", () => {
    const externalRecipes = fixtureRecipes(20);
    const first = generateWeekPlan({ ...baseInput, externalRecipes, random: alwaysFirst });
    expect(first.days.map((day) => day.sequence)).toEqual([0, 0, 0, 0, 0, 0, 0]);

    const second = generateWeekPlan({ ...baseInput, externalRecipes, previousWeek: first });
    expect(second.days.map((day) => day.sequence)).toEqual([1, 1, 1, 1, 1, 1, 1]);

    // A day edited in between keeps its higher sequence as the new baseline.
    const edited = {
      ...second,
      days: second.days.map((day, i) => (i === 3 ? { ...day, sequence: 9 } : day)),
    };
    const third = generateWeekPlan({ ...baseInput, externalRecipes, previousWeek: edited });
    expect(third.days.map((day) => day.sequence)).toEqual([2, 2, 2, 10, 2, 2, 2]);
  });

  it("keeps the original createdAt when regenerating over an existing week", () => {
    const externalRecipes = fixtureRecipes(20);
    const first = generateWeekPlan({ ...baseInput, externalRecipes });
    const second = generateWeekPlan({ ...baseInput, externalRecipes, previousWeek: first });

    expect(second.createdAt).toBe(first.createdAt);
  });

  it("produces a different week on regeneration rather than repeating the top picks", () => {
    const externalRecipes = fixtureRecipes(30);
    const plans = Array.from({ length: 5 }, () =>
      generateWeekPlan({ ...baseInput, externalRecipes })
        .days.map((day) => day.baseRecipeId)
        .join(","),
    );

    expect(new Set(plans).size).toBeGreaterThan(1);
  });

  it("avoids recipes cooked in recent weeks when there are enough alternatives", () => {
    const externalRecipes = fixtureRecipes(20);
    const recentRecipeIds = ["recipe-0", "recipe-1", "recipe-2", "recipe-3", "recipe-4"];

    for (let attempt = 0; attempt < 20; attempt++) {
      const week = generateWeekPlan({ ...baseInput, externalRecipes, recentRecipeIds });
      const ids = week.days.map((day) => day.baseRecipeId);
      expect(ids.filter((id) => recentRecipeIds.includes(id))).toEqual([]);
    }
  });

  it("falls back to recently-cooked recipes when the pool is too small to avoid them", () => {
    const externalRecipes = fixtureRecipes(7);
    const recentRecipeIds = externalRecipes.map((recipe) => recipe.id);

    const week = generateWeekPlan({ ...baseInput, externalRecipes, recentRecipeIds });
    expect(new Set(week.days.map((day) => day.baseRecipeId)).size).toBe(7);
  });

  it("skips recipes that have no ingredient list, so every day can be cooked from", () => {
    const cookable = fixtureRecipes(8);
    const unscraped: ExternalRecipe[] = Array.from({ length: 8 }, (_, i) => ({
      id: `empty-${i}`,
      title: `Empty ${i}`,
      url: `https://madogdrikke.rema1000.dk/opskrifter/empty-${i}`,
      ingredients: [],
      instructions: [],
    }));

    const week = generateWeekPlan({ ...baseInput, externalRecipes: [...unscraped, ...cookable] });
    expect(week.days.every((day) => day.recipeSnapshot.ingredientLines.length > 0)).toBe(true);
  });

  it("still plans a week when no recipe has an ingredient list", () => {
    const unscraped: ExternalRecipe[] = Array.from({ length: 8 }, (_, i) => ({
      id: `empty-${i}`,
      title: `Empty ${i}`,
      url: `https://madogdrikke.rema1000.dk/opskrifter/empty-${i}`,
      ingredients: [],
      instructions: [],
    }));

    const week = generateWeekPlan({ ...baseInput, externalRecipes: unscraped });
    expect(week.days).toHaveLength(7);
  });

  it("records a null offer snapshot id when generated without offers", () => {
    const week = generateWeekPlan({
      ...baseInput,
      offerSnapshotId: null,
      externalRecipes: fixtureRecipes(10),
    });

    expect(week.generatedFrom.offerSnapshotId).toBeNull();
  });
});
