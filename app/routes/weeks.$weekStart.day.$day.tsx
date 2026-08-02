import { Link, redirect } from "react-router";
import type { Route } from "./+types/weeks.$weekStart.day.$day";
import { requireUser } from "~/lib/auth";
import { useWeekPlan } from "~/ui/hooks/useWeekPlan";
import { useSwapDayRecipe } from "~/ui/hooks/useRegenerateDay";
import { DayCard } from "~/ui/components/DayCard";
import { RECIPE_CATALOG } from "~/domain/recipes/recipeCatalog";
import { Card } from "~/ui/components/ui/Card";
import { FieldLabel, Select } from "~/ui/components/ui/Input";

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
      <Link to={`/weeks/${weekStart}`} className="font-mono text-xs tracking-wide text-muted hover:text-ink">
        ← Back to week
      </Link>

      {day && (
        <div className="mt-4">
          <DayCard day={day} weekStart={weekStart} dayIndex={dayIndex} />

          <Card className="mt-4">
            <FieldLabel htmlFor="swap-recipe">Swap to a different recipe</FieldLabel>
            <Select
              id="swap-recipe"
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) swap.mutate({ dayIndex, recipeId: e.target.value });
              }}
            >
              <option value="" disabled>
                Choose a recipe…
              </option>
              {RECIPE_CATALOG.map((entry) => (
                <option key={entry.recipe.id} value={entry.recipe.id}>
                  {entry.recipe.title}
                </option>
              ))}
            </Select>
          </Card>
        </div>
      )}
    </main>
  );
}
