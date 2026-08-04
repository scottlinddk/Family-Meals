import { Link } from "react-router";
import type { Route } from "./+types/weeks.$weekStart";
import { useWeekPlan, useGenerateWeekPlan, NoRecipesError } from "~/ui/hooks/useWeekPlan";
import { WeekGrid } from "~/ui/components/WeekGrid";
import { InfantNote } from "~/ui/components/InfantNote";
import { Button } from "~/ui/components/ui/Button";
import { addDays } from "~/lib/time";
import { t } from "~/i18n/t";

export default function WeekPage({ params }: Route.ComponentProps) {
  const weekStart = params.weekStart!;
  const weekPlan = useWeekPlan(weekStart);
  const generate = useGenerateWeekPlan(weekStart);

  const prevWeek = addDays(weekStart, -7);
  const nextWeek = addDays(weekStart, 7);

  return (
    <>
      <div className="mb-4 flex items-center justify-center gap-2">
        <Link
          to={`/weeks/${prevWeek}`}
          className="flex h-11 w-11 items-center justify-center text-muted hover:text-accent"
          aria-label={t("week.prev")}
        >
          ←
        </Link>
        <h1 className="min-w-40 text-center text-2xl">{t("week.heading", { date: weekStart })}</h1>
        <Link
          to={`/weeks/${nextWeek}`}
          className="flex h-11 w-11 items-center justify-center text-muted hover:text-accent"
          aria-label={t("week.next")}
        >
          →
        </Link>
      </div>

      <div className="mb-4">
        <InfantNote />
      </div>

      {weekPlan.isLoading && <p className="text-muted">{t("week.loading")}</p>}

      {!weekPlan.isLoading && !weekPlan.data && (
        <div className="rounded-lg border border-dashed border-divider p-8 text-center">
          <p className="mb-4 opacity-80">{t("week.empty")}</p>
          <Button type="button" variant="primary" onClick={() => generate.mutate()} disabled={generate.isPending}>
            {generate.isPending ? t("week.generating") : t("week.generate")}
          </Button>
        </div>
      )}

      {generate.isError && (
        <p className="mt-3 text-sm text-red-700">
          {generate.error instanceof NoRecipesError ? (
            <>
              {t("week.noRecipes")}{" "}
              <Link to="/offers" className="text-accent underline hover:text-accent-700">
                {t("week.noRecipesAction")}
              </Link>
            </>
          ) : (
            t("week.generateFailed")
          )}
        </p>
      )}

      {weekPlan.data && (
        <>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="secondary"
              block
              onClick={() => generate.mutate()}
              disabled={generate.isPending}
            >
              {generate.isPending ? t("week.regeneratingWhole") : t("week.regenerateWhole")}
            </Button>
            <Link to={`/weeks/${weekStart}/shopping-list`} className="sm:w-auto">
              <Button type="button" variant="primary" block>
                {t("shoppingList.open")}
              </Button>
            </Link>
          </div>
          <WeekGrid week={weekPlan.data} />
        </>
      )}
    </>
  );
}
