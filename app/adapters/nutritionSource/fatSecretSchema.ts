import { z } from "zod";
import type { Nutrients } from "~/domain/nutrition/nutrients";

/**
 * Reading FatSecret's JSON, which has three habits worth naming up front —
 * all three verified against the published response samples in
 * platform.fatsecret.com/docs, and all three silent corrupters if ignored:
 *
 *   1. **Every number is a string.** `"calories": "165"`, `"protein":
 *      "31.02"`. Summed as-is, a recipe's calories become "165310231.02".
 *   2. **A one-element list is not a list.** `foods.food` and
 *      `servings.serving` are arrays when there are several and a bare object
 *      when there is one, so `.map` throws on exactly the foods that matched
 *      precisely.
 *   3. **Errors come back 200.** A bad token or an unknown method returns
 *      `{"error": {"code": 12, "message": "..."}}` with an HTTP 200, so a
 *      status check alone reports success for a response with no food in it.
 *
 * Parsing is therefore permissive about shape and strict about meaning:
 * anything numeric-looking is coerced, both list shapes are accepted, and a
 * response that doesn't contain a usable food says so rather than producing
 * an empty one.
 */

/** FatSecret's stringly-typed numbers, coerced — and rejected if not numeric. */
const numeric = z.union([z.number(), z.string()]).transform((value, ctx) => {
  const parsed = typeof value === "number" ? value : Number(value.trim());
  if (!Number.isFinite(parsed)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: `not a number: ${value}` });
    return z.NEVER;
  }
  return parsed;
});

const optionalNumeric = numeric.optional().catch(undefined);

/** Accepts both of FatSecret's list shapes (see habit 2 above). */
function listOf<T extends z.ZodTypeAny>(item: T) {
  return z.union([z.array(item), item.transform((one) => [one])]);
}

export const fatSecretErrorSchema = z.object({
  error: z.object({ code: numeric.optional(), message: z.string().optional() }),
});

const searchFoodSchema = z.object({
  food_id: z.union([z.string(), z.number()]).transform(String),
  food_name: z.string(),
  food_type: z.string().optional(),
  brand_name: z.string().optional(),
  food_description: z.string().optional(),
});

export const foodsSearchSchema = z.object({
  foods: z.object({
    food: listOf(searchFoodSchema).optional(),
    total_results: optionalNumeric,
  }),
});

const servingSchema = z.object({
  serving_id: z.union([z.string(), z.number()]).transform(String).optional(),
  serving_description: z.string().optional(),
  metric_serving_amount: optionalNumeric,
  metric_serving_unit: z.string().optional(),
  calories: optionalNumeric,
  protein: optionalNumeric,
  fat: optionalNumeric,
  carbohydrate: optionalNumeric,
  saturated_fat: optionalNumeric,
  fiber: optionalNumeric,
  sugar: optionalNumeric,
  sodium: optionalNumeric,
});

export const foodGetSchema = z.object({
  food: z.object({
    food_id: z.union([z.string(), z.number()]).transform(String),
    food_name: z.string(),
    food_type: z.string().optional(),
    brand_name: z.string().optional(),
    servings: z.object({ serving: listOf(servingSchema) }),
  }),
});

export type FatSecretSearchFood = z.infer<typeof searchFoodSchema>;
export type FatSecretServing = z.infer<typeof servingSchema>;
export type FatSecretFood = z.infer<typeof foodGetSchema>["food"];

export const tokenResponseSchema = z.object({
  access_token: z.string().min(1),
  /** Seconds. FatSecret issues 24-hour tokens; nothing here depends on that. */
  expires_in: numeric.optional(),
  token_type: z.string().optional(),
});

/**
 * Units FatSecret states a metric serving in, in grams.
 *
 * `ml` is taken as 1 g, the same simplification the ingredient-line estimator
 * makes: true for water, near enough for the milk and stock a recipe measures
 * in dl, and wrong by 8% for oil — where a per-100 g figure of 884 kcal
 * dwarfs the difference. `oz` appears on some US entries.
 */
const METRIC_UNIT_GRAMS: Record<string, number> = { g: 1, ml: 1, oz: 28.35 };

/**
 * The serving to normalise a food's figures from.
 *
 * A food carries several — "1 cup", "1 breast", "100 g" — and only the ones
 * stating a metric amount can be turned into a per-100 g figure at all. An
 * exact 100 g serving is preferred where one exists, because it needs no
 * scaling and is the entry FatSecret's own generic foods are built around;
 * otherwise the largest metric serving wins, since rounding in the source
 * figures matters proportionally less the more of the food they describe.
 */
export function pickMetricServing(servings: FatSecretServing[]): FatSecretServing | null {
  const metric = servings.filter(
    (serving) =>
      typeof serving.calories === "number" &&
      typeof serving.metric_serving_amount === "number" &&
      serving.metric_serving_amount > 0 &&
      (serving.metric_serving_unit ?? "").toLowerCase() in METRIC_UNIT_GRAMS,
  );
  if (metric.length === 0) return null;

  const hundredGrams = metric.find(
    (serving) =>
      serving.metric_serving_amount === 100 &&
      (serving.metric_serving_unit ?? "").toLowerCase() === "g",
  );
  if (hundredGrams) return hundredGrams;

  return metric.reduce((largest, serving) =>
    gramsOf(serving) > gramsOf(largest) ? serving : largest,
  );
}

function gramsOf(serving: FatSecretServing): number {
  const unit = (serving.metric_serving_unit ?? "").toLowerCase();
  return (serving.metric_serving_amount ?? 0) * (METRIC_UNIT_GRAMS[unit] ?? 1);
}

/**
 * A food's figures per 100 g, or null when it states no metric serving to
 * scale from — a "1 sandwich" entry with no weight can't be applied to
 * "150 g" of anything, and guessing its weight would be inventing data.
 */
export function toNutrientsPer100g(food: FatSecretFood): Nutrients | null {
  const serving = pickMetricServing(food.servings.serving);
  if (!serving) return null;

  const factor = 100 / gramsOf(serving);
  const per100g: Nutrients = { kcal: serving.calories! * factor };
  const optional: [keyof Nutrients, number | undefined][] = [
    ["proteinG", serving.protein],
    ["fatG", serving.fat],
    ["carbsG", serving.carbohydrate],
    ["saturatedFatG", serving.saturated_fat],
    ["fiberG", serving.fiber],
    ["sugarG", serving.sugar],
    ["sodiumMg", serving.sodium],
  ];
  for (const [key, value] of optional) {
    if (typeof value === "number") per100g[key] = value * factor;
  }
  return per100g;
}
