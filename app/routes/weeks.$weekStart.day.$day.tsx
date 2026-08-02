import { Link, redirect } from "react-router";
import type { Route } from "./+types/weeks.$weekStart.day.$day";
import { requireUser } from "~/lib/auth";
import { useWeekPlan } from "~/ui/hooks/useWeekPlan";
import { useSwapDayRecipe } from "~/ui/hooks/useRegenerateDay";
import { DayCard } from "~/ui/components/DayCard";
import { RECIPE_CATALOG } from "~/domain/recipes/recipeCatalog";
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
  const day = weekPlan.data?.days[dayIndex];

  return (
    <main className="mx-auto max-w-2xl p-6">
      <Link to={`/weeks/${weekStart}`} className="text-sm text-gray-500">
        {t("day.backToWeek")}
      </Link>

      {day && (
        <div className="mt-4">
          <DayCard day={day} weekStart={weekStart} dayIndex={dayIndex} />

          <div className="mt-4 rounded-lg border border-gray-200 p-4">
            <label htmlFor="swap-recipe" className="text-sm font-medium">
              {t("day.swapLabel")}
            </label>
            <select
              id="swap-recipe"
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) swap.mutate({ dayIndex, recipeId: e.target.value });
              }}
              className="mt-1 w-full rounded border border-gray-300 p-2 text-sm"
            >
              <option value="" disabled>
                {t("day.choosePlaceholder")}
              </option>
              {RECIPE_CATALOG.map((entry) => (
                <option key={entry.recipe.id} value={entry.recipe.id}>
                  {entry.recipe.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </main>
  );
}
