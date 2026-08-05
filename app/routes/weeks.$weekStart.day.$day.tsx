import type { Route } from "./+types/weeks.$weekStart.day.$day";
import { useWeekPlan } from "~/ui/hooks/useWeekPlan";
import { useSwapDayRecipe } from "~/ui/hooks/useRegenerateDay";
import { DayCard } from "~/ui/components/DayCard";
import { useExternalRecipes } from "~/ui/hooks/useExternalRecipes";
import { Card } from "~/ui/components/ui/Card";
import { BackLink } from "~/ui/components/ui/BackLink";
import { FieldLabel, Select } from "~/ui/components/ui/Input";
import { t } from "~/i18n/t";

export default function DayPage({ params }: Route.ComponentProps) {
  const weekStart = params.weekStart!;
  const dayIndex = Number(params.day);
  const weekPlan = useWeekPlan(weekStart);
  const swap = useSwapDayRecipe(weekStart);
  const recipes = useExternalRecipes();
  const day = weekPlan.data?.days[dayIndex];

  return (
    <>
      <BackLink to={`/weeks/${weekStart}`}>{t("day.backToWeek")}</BackLink>

      {weekPlan.isLoading && <p className="mt-4 text-muted">{t("week.loading")}</p>}
      {!weekPlan.isLoading && !day && <p className="mt-4 text-muted">{t("day.notFound")}</p>}

      {day && (
        <div className="mt-3">
          <DayCard day={day} weekStart={weekStart} dayIndex={dayIndex} expanded />

          <Card className="mt-4">
            <div>
              <FieldLabel htmlFor="swap-recipe">{t("day.swapLabel")}</FieldLabel>
              <Select
                id="swap-recipe"
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) swap.mutate({ dayIndex, recipeId: e.target.value });
                }}
              >
                <option value="" disabled>
                  {t("day.choosePlaceholder")}
                </option>
                {recipes.data?.map((recipe) => (
                  <option key={recipe.id} value={recipe.id}>
                    {recipe.title}
                  </option>
                ))}
              </Select>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
