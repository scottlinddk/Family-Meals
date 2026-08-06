import { describe, expect, it } from "vitest";
import {
  estimateLineGrams,
  estimateRecipeCalories,
  parseQuantity,
} from "~/domain/recipes/calorieEstimate";

describe("parseQuantity", () => {
  it("reads the forms REMA's ingredient lines use", () => {
    expect(parseQuantity("500 g hakket oksekød")).toBe(500);
    expect(parseQuantity("1,5 dl fløde")).toBe(1.5);
    expect(parseQuantity("½ citron")).toBe(0.5);
    expect(parseQuantity("1½ dl mælk")).toBe(1.5);
  });

  it("takes the middle of a range, because a range is an 'about'", () => {
    expect(parseQuantity("2-3 spsk olivenolie")).toBe(2.5);
  });

  it("is null when the line doesn't open with a number", () => {
    expect(parseQuantity("salt og peber")).toBeNull();
    expect(parseQuantity("frisk persille")).toBeNull();
  });
});

describe("estimateLineGrams", () => {
  it("converts the weight and volume units", () => {
    expect(estimateLineGrams("500 g hakket oksekød")).toBe(500);
    expect(estimateLineGrams("1 kg kartofler")).toBe(1000);
    expect(estimateLineGrams("2 dl piskefløde")).toBe(200);
    expect(estimateLineGrams("2 spsk olivenolie")).toBe(30);
    expect(estimateLineGrams("1 tsk salt")).toBe(5);
  });

  it("weighs the things a line counts rather than measures", () => {
    expect(estimateLineGrams("2 løg")).toBe(220);
    expect(estimateLineGrams("4 æg")).toBe(240);
    expect(estimateLineGrams("2 fed hvidløg")).toBe(10);
    expect(estimateLineGrams("1 dåse hakkede tomater")).toBe(400);
  });

  it("gives an unquantified line a garnish's weight", () => {
    expect(estimateLineGrams("salt og peber")).toBe(10);
  });
});

describe("estimateRecipeCalories", () => {
  it("is null when there is no ingredient list to estimate from", () => {
    expect(estimateRecipeCalories({ ingredients: [], servings: 4 })).toBeNull();
  });

  it("divides by the recipe's own servings, and says when it had to assume", () => {
    const stated = estimateRecipeCalories({ ingredients: ["1 kg kartofler"], servings: 2 })!;
    expect(stated.servings).toBe(2);
    expect(stated.servingsKnown).toBe(true);
    expect(stated.totalKcal).toBe(770);
    expect(stated.perServingKcal).toBe(385);

    const assumed = estimateRecipeCalories({ ingredients: ["1 kg kartofler"] })!;
    expect(assumed.servings).toBe(4);
    expect(assumed.servingsKnown).toBe(false);
  });

  it("reports how much of the ingredient list it actually recognised", () => {
    const estimate = estimateRecipeCalories({
      ingredients: ["500 g kartofler", "1 pakke fnysemos"],
      servings: 4,
    })!;
    expect(estimate.coverage).toBe(0.5);
    expect(estimate.unrecognisedLines).toEqual(["1 pakke fnysemos"]);
  });

  /*
   * The number that matters isn't any single recipe's total but the order the
   * ranking puts them in — which is the whole reason this module exists.
   */
  it("separates a lentil soup from a creamy pork dish by a wide margin", () => {
    const soup = estimateRecipeCalories({
      ingredients: ["300 g linser", "2 gulerødder", "1 løg", "1 l vand", "1 spsk olivenolie"],
      servings: 4,
    })!;
    const creamy = estimateRecipeCalories({
      ingredients: ["800 g svinekød", "5 dl piskefløde", "100 g smør", "500 g kartofler"],
      servings: 4,
    })!;

    expect(soup.perServingKcal).toBeLessThan(creamy.perServingKcal / 2);
  });

  it("doesn't price fresh herbs as dry rice", () => {
    // A plain substring match did exactly that: "friske" contains "ris".
    const herbs = estimateRecipeCalories({ ingredients: ["1 bundt friske krydderurter"] })!;
    expect(herbs.totalKcal).toBeLessThan(120);
  });
});

describe("a typo'd unit in the source data", () => {
  /*
   * "100 cm fløde" is a real line, in REMA's *Saltimbocca på Frilandsgris*.
   * An unknown unit is read as a count of the thing itself, so it parsed as
   * a hundred portions of cream and priced that recipe at 8900 kcal a
   * serving — enough on its own to distort a calorie ranking.
   */
  it("can't let one line dominate the recipe", () => {
    expect(estimateLineGrams("100 cm fløde")).toBe(1500);
    const estimate = estimateRecipeCalories({
      ingredients: ["4 stk kotelet med skaft", "100 cm fløde", "2 spsk smagsneutral olie"],
      servings: 4,
    })!;
    expect(estimate.perServingKcal).toBeLessThan(2000);
  });
});
