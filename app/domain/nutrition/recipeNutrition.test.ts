import { describe, expect, it } from "vitest";
import { computeRecipeNutrition, type NutrientLookup } from "~/domain/nutrition/recipeNutrition";
import { scaleNutrients, sumNutrients } from "~/domain/nutrition/nutrients";

/** Per-100 g figures of the kind FatSecret returns, keyed by ingredient term. */
const LOOKUP: NutrientLookup = new Map([
  ["kyllingebryst", { kcal: 165, proteinG: 31, fatG: 3.6, carbsG: 0 }],
  ["ris", { kcal: 365, proteinG: 7.1, fatG: 0.7, carbsG: 80 }],
  ["broccoli", { kcal: 34, proteinG: 2.8, fatG: 0.4, carbsG: 7 }],
  ["olivenolie", { kcal: 884, proteinG: 0, fatG: 100, carbsG: 0 }],
]);

const MEASURED = {
  ingredients: ["600 g kyllingebryst", "300 g ris", "400 g broccoli", "2 spsk olivenolie"],
  servings: 4,
};

describe("computeRecipeNutrition with FatSecret figures", () => {
  it("gives macros per serving once enough of the recipe is measured", () => {
    const nutrition = computeRecipeNutrition(MEASURED, { lookup: LOOKUP })!;

    expect(nutrition.dataCoverage).toBe(1);
    expect(nutrition.macrosPerServing).not.toBeNull();
    // 600 g of chicken breast is 186 g of protein on its own, and the rice
    // and broccoli add another 32 — a little over 54 g on each of four plates.
    expect(nutrition.macrosPerServing!.proteinG).toBeCloseTo(54.6, 1);
    // Two tablespoons of olive oil are more than half the dish's fat.
    expect(nutrition.macrosPerServing!.fatG).toBeCloseTo(13.8, 1);
  });

  it("agrees with the arithmetic done by hand", () => {
    const nutrition = computeRecipeNutrition(MEASURED, { lookup: LOOKUP })!;
    const byHand = sumNutrients([
      scaleNutrients(LOOKUP.get("kyllingebryst")!, 600),
      scaleNutrients(LOOKUP.get("ris")!, 300),
      scaleNutrients(LOOKUP.get("broccoli")!, 400),
      scaleNutrients(LOOKUP.get("olivenolie")!, 30),
    ]);
    expect(nutrition.totalKcal).toBe(Math.round(byHand.kcal));
    expect(nutrition.perServingKcal).toBe(Math.round(byHand.kcal / 4));
  });

  it("withholds macros when too little of the recipe was measured", () => {
    const nutrition = computeRecipeNutrition(
      {
        ingredients: ["600 g kyllingebryst", "500 g flæskesteg", "1 pakke fnysemos"],
        servings: 4,
      },
      { lookup: LOOKUP },
    )!;

    expect(nutrition.dataCoverage).toBeCloseTo(1 / 3);
    // A protein figure from a third of the ingredients is a half-read recipe,
    // not a low-protein dinner.
    expect(nutrition.macrosPerServing).toBeNull();
    // The calories are still there, from the local table where FatSecret had
    // nothing — which is the whole point of mixing the two per line.
    expect(nutrition.perServingKcal).toBeGreaterThan(0);
  });

  it("still counts a line the local table can't recognise but FatSecret can", () => {
    const nutrition = computeRecipeNutrition(
      { ingredients: ["200 g kyllingebryst"], servings: 1 },
      { lookup: LOOKUP },
    )!;
    expect(nutrition.coverage).toBe(1);
    expect(nutrition.unrecognisedLines).toEqual([]);
    expect(nutrition.lines[0]!.source).toBe("fatsecret");
  });

  it("falls back per line, not per recipe", () => {
    const nutrition = computeRecipeNutrition(
      { ingredients: ["300 g ris", "1 pakke fnysemos"], servings: 2 },
      { lookup: LOOKUP },
    )!;
    expect(nutrition.lines.map((line) => line.source)).toEqual(["fatsecret", "default"]);
  });
});

describe("computeRecipeNutrition without any lookup", () => {
  it("is the ingredient-line calorie estimate, unchanged", () => {
    const nutrition = computeRecipeNutrition(MEASURED)!;
    expect(nutrition.dataCoverage).toBe(0);
    expect(nutrition.macrosPerServing).toBeNull();
    expect(nutrition.perServingKcal).toBeGreaterThan(0);
    expect(nutrition.lines.every((line) => line.source === "table")).toBe(true);
  });

  it("is null when there is no ingredient list to compute from", () => {
    expect(computeRecipeNutrition({ ingredients: [], servings: 4 })).toBeNull();
  });
});
