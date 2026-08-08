import { Link } from "react-router";
import type { Route } from "./+types/weeks.$weekStart";
import { useWeekPlan, useGenerateWeekPlan, NoRecipesError } from "~/ui/hooks/useWeekPlan";
import { SchemaOutOfDateError } from "~/lib/dbErrors";
import { WeekGrid } from "~/ui/components/WeekGrid";
import { ShareButton } from "~/ui/components/ShareButton";
import { InfantNote } from "~/ui/components/InfantNote";
import { Button, IconLink, LinkButton } from "~/ui/components/ui/Button";
import { CardKicker } from "~/ui/components/ui/Card";
import { Tag } from "~/ui/components/ui/Tag";
import { ChevronLeftIcon, ChevronRightIcon } from "~/ui/components/Icon";
import { addDays, mondayOf, todayIso } from "~/lib/time";
import { t } from "~/i18n/t";

export default function WeekPage({ params }: Route.ComponentProps) {
  const weekStart = params.weekStart!;
  const weekPlan = useWeekPlan(weekStart);
  const generate = useGenerateWeekPlan(weekStart);

  const prevWeek = addDays(weekStart, -7);
  const nextWeek = addDays(weekStart, 7);

  // Tells whether the week being viewed is the current or the next one, so
  // flicking back and forth with the arrows doesn't lose track of "now".
  const currentWeekStart = mondayOf(todayIso());
  const isCurrentWeek = weekStart === currentWeekStart;
  const isNextWeek = weekStart === addDays(currentWeekStart, 7);

  return (
    <>
      <div className="mb-5 flex items-center justify-between gap-3">
        <IconLink to={`/weeks/${prevWeek}`} aria-label={t("week.prev")}>
          <ChevronLeftIcon size={18} />
        </IconLink>
        <div className="min-w-44 text-center">
          <CardKicker>{t("week.kicker")}</CardKicker>
          <h1 className="mt-1 text-xl">{t("week.heading", { date: weekStart })}</h1>
          {(isCurrentWeek || isNextWeek) && (
            <div className="mt-1.5">
              <Tag variant="accent">{t(isCurrentWeek ? "week.thisWeek" : "week.nextWeek")}</Tag>
            </div>
          )}
        </div>
        <IconLink to={`/weeks/${nextWeek}`} aria-label={t("week.next")}>
          <ChevronRightIcon size={18} />
        </IconLink>
      </div>

      <div className="mb-5">
        <InfantNote />
      </div>

      {weekPlan.isLoading && <p className="text-muted">{t("week.loading")}</p>}

      {!weekPlan.isLoading && !weekPlan.data && (
        <div className="rounded-lg border border-dashed border-divider p-8 text-center">
          <p className="mb-4 text-muted">{t("week.empty")}</p>
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
              <Link to="/offers" viewTransition className="font-semibold text-accent underline hover:text-accent-700">
                {t("week.noRecipesAction")}
              </Link>
            </>
          ) : generate.error instanceof SchemaOutOfDateError ? (
            t("week.schemaOutOfDate")
          ) : (
            t("week.generateFailed")
          )}
        </p>
      )}

      {weekPlan.data && (
        <>
          <div className="mb-5 flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="secondary"
              block
              onClick={() => generate.mutate()}
              disabled={generate.isPending}
            >
              {generate.isPending ? t("week.regeneratingWhole") : t("week.regenerateWhole")}
            </Button>
            <LinkButton to={`/weeks/${weekStart}/shopping-list`} variant="primary" block className="sm:w-auto">
              {t("shoppingList.open")}
            </LinkButton>
            {/* Sends the seven dinners as they stand — read-only, and live,
                so a dish swapped after sending updates for them too. */}
            <ShareButton
              target={{ kind: "week", weekStartDate: weekStart }}
              size="md"
              className="w-full sm:w-auto"
            />
          </div>
          <WeekGrid week={weekPlan.data} />
        </>
      )}
    </>
  );
}
