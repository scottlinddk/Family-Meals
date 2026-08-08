import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { ExternalRecipe, Offer } from "~/domain/types";
import { computeRecipeNutrition } from "~/domain/nutrition/recipeNutrition";
import { assessVegetarian } from "~/domain/recipes/vegetarian";
import { rankRecipeSuggestions } from "~/domain/recipes/suggestionRanking";

/**
 * The ranking, against the real thing.
 *
 * `scrape-output/` holds what the `Scrape REMA recipes` workflow actually
 * pulled down — 350 dinner recipes and a week's 91 offers — and every
 * judgement call in `calorieEstimate.ts` and `vegetarian.ts` was made by
 * running against it rather than against invented examples. This pins the
 * properties that measurement established, loosely enough that a fresh
 * scrape with different recipes doesn't fail the build, and tightly enough
 * that the two bugs it found can't come back:
 *
 *   * a typo'd unit ("100 cm fløde") pricing one recipe at 8900 kcal/serving,
 *   * the text scan calling 115 of 350 recipes meat-free, kødboller included.
 *
 * Skipped rather than failed when the files aren't there, since they're a
 * build artefact and not everyone checking out this repo will have them.
 */
const RECIPES_PATH = "scrape-output/rema-recipes.json";
const OFFERS_PATH = "scrape-output/rema1000-offers.json";
const haveScrape = existsSync(RECIPES_PATH) && existsSync(OFFERS_PATH);

describe.skipIf(!haveScrape)("ranking against the real scrape", () => {
  const recipes: ExternalRecipe[] = JSON.parse(readFileSync(RECIPES_PATH, "utf8")).recipes;
  const offers: Offer[] = JSON.parse(readFileSync(OFFERS_PATH, "utf8")).offers;

  it("recognises most of what real ingredient lines name", () => {
    const estimates = recipes.map((recipe) => computeRecipeNutrition(recipe)).filter((e) => e !== null);
    const meanCoverage =
      estimates.reduce((sum, estimate) => sum + estimate.coverage, 0) / estimates.length;
    expect(meanCoverage).toBeGreaterThan(0.85);
  });

  it("puts real dinners in a plausible calorie band", () => {
    const perServing = recipes
      .map((recipe) => computeRecipeNutrition(recipe)?.perServingKcal)
      .filter((kcal): kcal is number => kcal !== undefined)
      .sort((a, b) => a - b);

    const median = perServing[Math.floor(perServing.length / 2)]!;
    expect(median).toBeGreaterThan(200);
    expect(median).toBeLessThan(1500);
    // No recipe should look like a typo again. The ceiling is generous on
    // purpose — REMA does publish single-serving recipes for a whole pizza.
    expect(perServing.at(-1)!).toBeLessThan(5000);
  });

  it("calls a believable share of recipes meat-free, and never one with meat in it", () => {
    const vegetarian = recipes.filter((recipe) => assessVegetarian(recipe).vegetarian);
    const tagged = recipes.filter((recipe) => (recipe.tags ?? []).includes("kodfri"));

    // At most what REMA tags, because the ingredient scan can only veto.
    expect(vegetarian.length).toBeLessThanOrEqual(tagged.length);
    // And not so few that the veto has swallowed the whole list.
    expect(vegetarian.length).toBeGreaterThan(tagged.length / 2);

    for (const recipe of vegetarian) {
      expect(assessVegetarian(recipe).meatLines, recipe.title).toHaveLength(0);
    }
  });

  it("gives every mode a full list of suggestions from real data", () => {
    for (const sort of ["balanced", "offers", "calories"] as const) {
      expect(rankRecipeSuggestions(recipes, offers, { sort, limit: 24 })).toHaveLength(24);
    }
    // The vegetarian filter has ~60 recipes to work with, so a full panel is
    // still a real test of it.
    expect(rankRecipeSuggestions(recipes, offers, { vegetarianOnly: true, limit: 24 })).toHaveLength(24);
  });

  it("leads the offers mode with the week's best-covered recipes", () => {
    // Unlimited, so the top of the list can be checked against the whole of
    // it — matching 350 recipes against 91 offers is the expensive part, and
    // one pass answers both halves of the question.
    const ranked = rankRecipeSuggestions(recipes, offers, { sort: "offers" });
    expect(ranked[0]!.offerScore).toBe(Math.max(...ranked.map((s) => s.offerScore)));
  });
});
