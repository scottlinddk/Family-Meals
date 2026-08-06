import { Card, CardTitle } from "~/ui/components/ui/Card";
import type { RecipeNutrition } from "~/domain/nutrition/recipeNutrition";
import { t } from "~/i18n/t";

/**
 * What a dinner puts on one plate.
 *
 * The panel's real job is saying *how much of this is known*. Two very
 * different things can produce a calorie figure here: FatSecret's food
 * database, which also knows protein and fat, and the app's own table of
 * per-100 g calories read off the ingredient lines, which knows neither. A
 * card that showed "612 kcal" identically in both cases would be claiming a
 * nutrition label it doesn't have — so the measured share is printed under
 * the figures, the estimate keeps its "~", and the macros simply aren't there
 * when too little of the recipe was measured to mean anything.
 */
export function NutritionPanel({ nutrition }: { nutrition: RecipeNutrition }) {
  const macros = nutrition.macrosPerServing;
  const measuredPercent = Math.round(nutrition.dataCoverage * 100);

  return (
    <Card className="mb-3">
      <CardTitle>{t("nutrition.heading")}</CardTitle>

      <dl className="m-0 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
        <Figure
          label={t("nutrition.energy")}
          value={
            macros
              ? t("nutrition.kcal", { value: nutrition.perServingKcal })
              : t("nutrition.kcalApprox", { value: nutrition.perServingKcal })
          }
        />
        {macros && (
          <>
            <Figure label={t("nutrition.protein")} value={t("nutrition.grams", { value: macros.proteinG! })} />
            <Figure label={t("nutrition.fat")} value={t("nutrition.grams", { value: macros.fatG! })} />
            <Figure label={t("nutrition.carbs")} value={t("nutrition.grams", { value: macros.carbsG! })} />
          </>
        )}
      </dl>

      <p className="m-0 text-xs text-muted">
        {macros
          ? t("nutrition.measured", { percent: measuredPercent })
          : measuredPercent > 0
            ? t("nutrition.partial", { percent: measuredPercent })
            : t("nutrition.estimated")}
        {!nutrition.servingsKnown && ` ${t("nutrition.servingsAssumed", { count: nutrition.servings })}`}
      </p>
    </Card>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="m-0 text-xs text-muted">{label}</dt>
      <dd className="m-0 text-lg font-semibold">{value}</dd>
    </div>
  );
}
