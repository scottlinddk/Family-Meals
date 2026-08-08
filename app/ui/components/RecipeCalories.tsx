import { useMemo } from "react";
import { computeRecipeNutrition, type RecipeNutrition } from "~/domain/nutrition/recipeNutrition";
import { t } from "~/i18n/t";

/**
 * A recipe's calories per serving, estimated from its ingredient lines.
 *
 * REMA's recipes carry no nutrition data, so there is no figure to read off —
 * see `recipeNutrition.ts` for how one is computed and how rough it is
 * without a FatSecret lookup. The estimate is worth showing anyway: choosing
 * between tonight's dish and another is exactly the comparison it's good at,
 * and it was previously only on the offers page's suggestion cards, which
 * meant the number vanished the moment a recipe was actually planned.
 *
 * Called with no `lookup`, so this reproduces the old ingredient-line
 * estimate exactly — the measured figures from FatSecret live in the
 * suggestions panel, which has the cache to look them up from.
 *
 * Memoised because a week grid asks for seven of these on every render, and
 * each one walks every ingredient line against the whole product table.
 */
export function useCalorieEstimate(
  ingredientLines: string[] | undefined,
  servings: number | undefined,
): RecipeNutrition | null {
  return useMemo(
    () =>
      ingredientLines?.length
        ? computeRecipeNutrition({ ingredients: ingredientLines, servings })
        : null,
    [ingredientLines, servings],
  );
}

/**
 * The figure as one more item in a recipe's meta line, alongside servings and
 * time. Renders nothing when there are no ingredient lines to estimate from —
 * a scrape that produced none can't be given a number, and inventing one
 * would read exactly like a measured value.
 *
 * Always written with a "~" and the word "skøn": it must never be mistaken
 * for a nutrition label.
 */
export function CalorieMeta({
  ingredientLines,
  servings,
}: {
  ingredientLines: string[] | undefined;
  servings: number | undefined;
}) {
  const estimate = useCalorieEstimate(ingredientLines, servings);
  if (!estimate) return null;
  return <span>{t("recipeDetail.kcalPerServing", { kcal: estimate.perServingKcal })}</span>;
}
