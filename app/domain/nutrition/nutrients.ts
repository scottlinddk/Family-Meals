/**
 * What a food is made of, as figures the app can add up and divide.
 *
 * Energy is always present — it is the one number every source carries and
 * the one the ranking has always used. The macros are optional because the
 * two sources disagree about what they know: FatSecret returns protein, fat
 * and carbohydrate for everything, while the local fallback table in
 * `calorieEstimate.ts` only ever held kcal. A recipe assembled from both
 * therefore has to be able to say "1100 kcal, and protein for two thirds of
 * the ingredients" rather than inventing the third.
 *
 * Everything here is per 100 g of the food itself, not per serving. Serving
 * arithmetic happens once, at the end, in `recipeNutrition.ts`.
 */
export interface Nutrients {
  kcal: number;
  proteinG?: number;
  fatG?: number;
  carbsG?: number;
  saturatedFatG?: number;
  fiberG?: number;
  sugarG?: number;
  sodiumMg?: number;
}

/** The macro keys, in the order they are shown. */
export const MACRO_KEYS = ["proteinG", "fatG", "carbsG"] as const;

export type MacroKey = (typeof MACRO_KEYS)[number];

const OPTIONAL_KEYS = [
  "proteinG",
  "fatG",
  "carbsG",
  "saturatedFatG",
  "fiberG",
  "sugarG",
  "sodiumMg",
] as const;

/** Whether a set of figures carries the three macros the UI actually shows. */
export function hasMacros(nutrients: Nutrients): boolean {
  return MACRO_KEYS.every((key) => typeof nutrients[key] === "number");
}

/**
 * `per100g` scaled to `grams` of it.
 *
 * An absent field stays absent rather than becoming zero: "we don't know this
 * food's protein" and "this food has no protein" are different claims, and
 * collapsing them would let a recipe full of unknowns report a confident 0 g.
 */
export function scaleNutrients(per100g: Nutrients, grams: number): Nutrients {
  const factor = grams / 100;
  const scaled: Nutrients = { kcal: per100g.kcal * factor };
  for (const key of OPTIONAL_KEYS) {
    const value = per100g[key];
    if (typeof value === "number") scaled[key] = value * factor;
  }
  return scaled;
}

/**
 * The sum of several foods' figures.
 *
 * A field is summed only over the entries that have it, and is dropped
 * entirely when none do — so a total's protein means "the protein of the
 * ingredients we have protein for", and `recipeNutrition.ts` publishes the
 * coverage that goes with it rather than leaving the caller to guess.
 */
export function sumNutrients(parts: Nutrients[]): Nutrients {
  const total: Nutrients = { kcal: 0 };
  for (const part of parts) {
    total.kcal += part.kcal;
    for (const key of OPTIONAL_KEYS) {
      const value = part[key];
      if (typeof value === "number") total[key] = (total[key] ?? 0) + value;
    }
  }
  return total;
}

/** `nutrients` split between `servings` people. */
export function divideNutrients(nutrients: Nutrients, servings: number): Nutrients {
  return scaleNutrients(nutrients, 100 / servings);
}

/** Rounds for display: whole kcal, one decimal on the grams, whole mg. */
export function roundNutrients(nutrients: Nutrients): Nutrients {
  const rounded: Nutrients = { kcal: Math.round(nutrients.kcal) };
  for (const key of OPTIONAL_KEYS) {
    const value = nutrients[key];
    if (typeof value !== "number") continue;
    rounded[key] = key === "sodiumMg" ? Math.round(value) : Math.round(value * 10) / 10;
  }
  return rounded;
}
