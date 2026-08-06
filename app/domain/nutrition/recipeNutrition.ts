import type { ExternalRecipe } from "~/domain/types";
import {
  DEFAULT_KCAL_PER_100G,
  DEFAULT_SERVINGS,
  KCAL_PER_100G,
  estimateLineGrams,
  lookupProduct,
  withoutQuantity,
} from "~/domain/recipes/calorieEstimate";
import { ingredientTerm, type NutritionLanguage } from "~/domain/nutrition/ingredientTerms";
import {
  divideNutrients,
  hasMacros,
  roundNutrients,
  scaleNutrients,
  sumNutrients,
  type Nutrients,
} from "~/domain/nutrition/nutrients";

/**
 * What a recipe puts on a plate, from real nutrition data where there is any.
 *
 * This is the same arithmetic the calorie estimate has always done — grams
 * per ingredient line, times a per-100 g figure, divided by servings — with
 * the per-100 g figure now coming from FatSecret's food database rather than
 * from a hand-written table of Danish products. What changes is not mainly
 * the accuracy of the calories (the table was already good enough to rank
 * dinners) but that *protein, fat and carbohydrate exist at all*: no table of
 * kcal could ever have produced them.
 *
 * The two sources are mixed per line, not chosen per recipe. FatSecret will
 * not know every line — an unrecognised Danish compound, a product with no
 * English name, a lookup that hasn't been run yet — and dropping a whole
 * recipe because one line missed would leave most of the cache unranked. So
 * a line uses FatSecret's figures when they exist and the local kcal table
 * when they don't, and the result reports exactly how much of it came from
 * where:
 *
 *   * `coverage` — share of lines that got *any* energy figure. Unchanged in
 *     meaning from the old estimate, so the ranking keeps working.
 *   * `dataCoverage` — share of lines whose figures came from FatSecret.
 *
 * `macrosPerServing` is null below `MIN_MACRO_COVERAGE`, because a protein
 * figure computed from a third of a recipe's ingredients is not a low-protein
 * dinner — it is a half-read one, and showing it as a number would be a
 * claim the data doesn't support.
 */

/**
 * How much of a recipe FatSecret has to cover before its macros are shown.
 *
 * Two thirds: enough that the missing lines are garnishes and oddities rather
 * than the dish itself, and low enough that a recipe with one exotic
 * ingredient still gets a protein figure.
 */
const MIN_MACRO_COVERAGE = 2 / 3;

/** Per-100 g figures by ingredient term key — see `ingredientTerms.ts`. */
export type NutrientLookup = ReadonlyMap<string, Nutrients>;

/** Where one ingredient line's figures came from. */
export type LineSource = "fatsecret" | "table" | "default";

export interface NutritionLine {
  line: string;
  /** The lookup key this line resolved to, if it resolved to one. */
  term?: string;
  grams: number;
  nutrients: Nutrients;
  source: LineSource;
}

export interface RecipeNutrition {
  /** Whole-recipe estimate, in kcal. */
  totalKcal: number;
  /** The number that matters for choosing a dinner. */
  perServingKcal: number;
  /** Servings the figures are divided by — the recipe's own, or the default. */
  servings: number;
  /** Whether `servings` came from the recipe or was assumed. */
  servingsKnown: boolean;
  /** Share of ingredient lines whose product was recognised at all, 0–1. */
  coverage: number;
  /** Share of ingredient lines whose figures came from FatSecret, 0–1. */
  dataCoverage: number;
  /** Protein/fat/carbohydrate per serving; null when `dataCoverage` is too low. */
  macrosPerServing: Nutrients | null;
  /** Whole-recipe figures, for anyone cooking the full pot. */
  total: Nutrients;
  /** Ingredient lines that fell back to `DEFAULT_KCAL_PER_100G`. */
  unrecognisedLines: string[];
  /** Per-line breakdown, so a surprising total is auditable. */
  lines: NutritionLine[];
}

export interface NutritionOptions {
  /** Per-100 g figures from FatSecret, keyed by ingredient term. */
  lookup?: NutrientLookup;
  /** Which language the terms were resolved in — must match how they were cached. */
  language?: NutritionLanguage;
}

/**
 * A recipe's nutrition per serving, or null when there is nothing to compute
 * from — a scrape that produced no ingredient list can't be given a number,
 * and guessing one would put it in the middle of a ranking it has no business
 * being in.
 *
 * With no `lookup` this reproduces the old ingredient-line calorie estimate
 * exactly, which is what makes the feature safe to ship before any FatSecret
 * credentials exist: the app keeps ranking dinners the way it did, and gains
 * macros only for the recipes the lookup covers.
 */
export function computeRecipeNutrition(
  recipe: Pick<ExternalRecipe, "ingredients" | "servings">,
  { lookup, language = "en" }: NutritionOptions = {},
): RecipeNutrition | null {
  if (recipe.ingredients.length === 0) return null;

  const lines: NutritionLine[] = recipe.ingredients.map((line) =>
    lineNutrition(line, lookup, language),
  );

  const total = sumNutrients(lines.map((entry) => entry.nutrients));
  const servingsKnown = typeof recipe.servings === "number" && recipe.servings > 0;
  const servings = servingsKnown ? recipe.servings! : DEFAULT_SERVINGS;
  const perServing = divideNutrients(total, servings);

  const fromFatSecret = lines.filter((entry) => entry.source === "fatsecret").length;
  const dataCoverage = fromFatSecret / lines.length;
  const unrecognisedLines = lines
    .filter((entry) => entry.source === "default")
    .map((entry) => entry.line);

  return {
    totalKcal: Math.round(total.kcal),
    perServingKcal: Math.round(perServing.kcal),
    servings,
    servingsKnown,
    coverage: (lines.length - unrecognisedLines.length) / lines.length,
    dataCoverage,
    macrosPerServing:
      dataCoverage >= MIN_MACRO_COVERAGE && hasMacros(perServing)
        ? roundNutrients(perServing)
        : null,
    total: roundNutrients(total),
    unrecognisedLines,
    lines,
  };
}

function lineNutrition(
  line: string,
  lookup: NutrientLookup | undefined,
  language: NutritionLanguage,
): NutritionLine {
  const grams = estimateLineGrams(line);
  const term = ingredientTerm(line, language);
  const measured = term && lookup?.get(term.key);

  if (measured) {
    return { line, term: term.key, grams, nutrients: scaleNutrients(measured, grams), source: "fatsecret" };
  }

  /*
   * No measured figures for this line, so fall back to the local table by the
   * same vocabulary word — `ingredientTerm` and `lookupProduct` agree about
   * which word a line names, so a line that FatSecret missed still gets the
   * kcal figure it has always had.
   */
  const key = lookupProduct(withoutQuantity(line));
  const kcalPer100g = key ? KCAL_PER_100G[key]! : DEFAULT_KCAL_PER_100G;
  return {
    line,
    term: term?.key,
    grams,
    nutrients: { kcal: (grams / 100) * kcalPer100g },
    source: key ? "table" : "default",
  };
}
