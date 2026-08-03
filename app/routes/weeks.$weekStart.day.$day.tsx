import { Link, redirect } from "react-router";
import type { Route } from "./+types/weeks.$weekStart.day.$day";
import { requireUser } from "~/lib/auth";
import { useWeekPlan } from "~/ui/hooks/useWeekPlan";
import { useSwapDayRecipe } from "~/ui/hooks/useRegenerateDay";
import { DayCard } from "~/ui/components/DayCard";
import { useExternalRecipes } from "~/ui/hooks/useExternalRecipes";
import { Card } from "~/ui/components/ui/Card";
import { FieldLabel, Select } from "~/ui/components/ui/Input";
import { t } from "~/i18n/t";

export async function loader({ request }: Route.LoaderArgs) {
  const headers = new Headers();
  const user = await requireUser(request, headers);
  if (!user) return redirect("/auth/login", { headers });
  return null;
}

export default function DayPage({ params }: Route.ComponentProps) {
  const weekStart = params.weekStart!;
  const dayIndex = Number(params.day);
  const weekPlan = useWeekPlan(weekStart);
  const swap = useSwapDayRecipe(weekStart);
  const recipes = useExternalRecipes();
  const day = weekPlan.data?.days[dayIndex];

  return (
    <main className="mx-auto max-w-2xl p-6">
      <Link to={`/weeks/${weekStart}`} className="text-sm text-accent hover:text-accent-700">
        {t("day.backToWeek")}
      </Link>

      {day && (
        <div className="mt-4">
          <DayCard day={day} weekStart={weekStart} dayIndex={dayIndex} />

          <Card className="mt-4">
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
          </Card>
        </div>
      )}
    </main>
  );
}
