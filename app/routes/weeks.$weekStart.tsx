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
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center gap-4 border-b border-divider px-6 py-3">
        <span className="mr-auto text-lg font-semibold">{t("app.title")}</span>
        <Link to="/offers" className="text-sm hover:text-accent">
          {t("week.manageOffers")}
        </Link>
        <Link to="/family" className="text-sm hover:text-accent">
          {t("week.family")}
        </Link>
        <SubscribeCalloutModal />
        <Form method="post" action="/auth/logout">
          <button type="submit" className="text-sm hover:text-accent">
            {t("week.signOut")}
          </button>
        </Form>
      </div>

      <main className="p-6">
        <div className="mb-4 flex items-center justify-center gap-2">
          <Link to={`/weeks/${prevWeek}`} className="text-muted hover:text-accent" aria-label={t("week.prev")}>
            ←
          </Link>
          <h1 className="min-w-40 text-center text-2xl">{t("week.heading", { date: weekStart })}</h1>
          <Link to={`/weeks/${nextWeek}`} className="text-muted hover:text-accent" aria-label={t("week.next")}>
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

        {weekPlan.data && (
          <>
            <Button
              type="button"
              variant="secondary"
              block
              className="mb-4"
              onClick={() => generate.mutate()}
              disabled={generate.isPending}
            >
              {generate.isPending ? t("week.regeneratingWhole") : t("week.regenerateWhole")}
            </Button>
            <WeekGrid week={weekPlan.data} />
          </>
        )}
      </main>
    </div>
  );
}
