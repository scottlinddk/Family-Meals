import { Form, Link, redirect } from "react-router";
import type { Route } from "./+types/weeks.$weekStart";
import { requireUser } from "~/lib/auth";
import { useWeekPlan, useGenerateWeekPlan } from "~/ui/hooks/useWeekPlan";
import { WeekGrid } from "~/ui/components/WeekGrid";
import { InfantNote } from "~/ui/components/InfantNote";
import { SubscribeCalloutModal } from "~/ui/components/SubscribeCalloutModal";
import { Button } from "~/ui/components/ui/Button";
import { addDays } from "~/lib/time";
import { t } from "~/i18n/t";

export async function loader({ request }: Route.LoaderArgs) {
  const headers = new Headers();
  const user = await requireUser(request, headers);
  if (!user) return redirect("/auth/login", { headers });
  return null;
}

export default function WeekPage({ params }: Route.ComponentProps) {
  const weekStart = params.weekStart!;
  const weekPlan = useWeekPlan(weekStart);
  const generate = useGenerateWeekPlan(weekStart);

  const prevWeek = addDays(weekStart, -7);
  const nextWeek = addDays(weekStart, 7);

  return (
    <main className="mx-auto max-w-3xl p-6">
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to={`/weeks/${prevWeek}`} className="font-mono text-xs tracking-wide text-muted hover:text-ink">
            {t("week.prev")}
          </Link>
          <h1 className="font-display text-4xl">{t("week.heading", { date: weekStart })}</h1>
          <Link to={`/weeks/${nextWeek}`} className="font-mono text-xs tracking-wide text-muted hover:text-ink">
            {t("week.next")}
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/offers" className="font-mono text-xs tracking-wide text-muted underline hover:text-ink">
            {t("week.manageOffers")}
          </Link>
          <SubscribeCalloutModal />
          <Form method="post" action="/auth/logout">
            <button
              type="submit"
              className="font-mono text-xs tracking-wide text-muted underline hover:text-ink"
            >
              {t("week.signOut")}
            </button>
          </Form>
        </div>
      </header>

      <div className="mb-4">
        <InfantNote />
      </div>

      {weekPlan.isLoading && <p className="text-ink-2">{t("week.loading")}</p>}

      {!weekPlan.isLoading && !weekPlan.data && (
        <div className="rounded-xl border border-dashed border-line-2 p-8 text-center">
          <p className="mb-4 text-ink-2">{t("week.empty")}</p>
          <Button type="button" variant="primary" onClick={() => generate.mutate()} disabled={generate.isPending}>
            {generate.isPending ? t("week.generating") : t("week.generate")}
          </Button>
        </div>
      )}

      {weekPlan.data && (
        <>
          <div className="mb-4 flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => generate.mutate()}
              disabled={generate.isPending}
            >
              {generate.isPending ? t("week.regeneratingWhole") : t("week.regenerateWhole")}
            </Button>
          </div>
          <WeekGrid week={weekPlan.data} />
        </>
      )}
    </main>
  );
}
