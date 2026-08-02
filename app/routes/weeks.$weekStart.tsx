import { Form, Link, redirect } from "react-router";
import type { Route } from "./+types/weeks.$weekStart";
import { requireUser } from "~/lib/auth";
import { useWeekPlan, useGenerateWeekPlan } from "~/ui/hooks/useWeekPlan";
import { WeekGrid } from "~/ui/components/WeekGrid";
import { InfantNote } from "~/ui/components/InfantNote";
import { SubscribeCalloutModal } from "~/ui/components/SubscribeCalloutModal";
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
      <header className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to={`/weeks/${prevWeek}`} className="text-sm text-gray-500">
            {t("week.prev")}
          </Link>
          <h1 className="text-xl font-semibold">{t("week.heading", { date: weekStart })}</h1>
          <Link to={`/weeks/${nextWeek}`} className="text-sm text-gray-500">
            {t("week.next")}
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/offers" className="text-sm text-gray-500 underline">
            {t("week.manageOffers")}
          </Link>
          <SubscribeCalloutModal />
          <Form method="post" action="/auth/logout">
            <button type="submit" className="text-sm text-gray-500 underline">
              {t("week.signOut")}
            </button>
          </Form>
        </div>
      </header>

      <div className="mb-4">
        <InfantNote />
      </div>

      {weekPlan.isLoading && <p>{t("week.loading")}</p>}

      {!weekPlan.isLoading && !weekPlan.data && (
        <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center">
          <p className="mb-3 text-gray-600">{t("week.empty")}</p>
          <button
            type="button"
            onClick={() => generate.mutate()}
            disabled={generate.isPending}
            className="rounded bg-gray-900 px-4 py-2 text-white disabled:opacity-50"
          >
            {generate.isPending ? t("week.generating") : t("week.generate")}
          </button>
        </div>
      )}

      {weekPlan.data && (
        <>
          <div className="mb-3 flex justify-end">
            <button
              type="button"
              onClick={() => generate.mutate()}
              disabled={generate.isPending}
              className="rounded border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50"
            >
              {generate.isPending ? t("week.regeneratingWhole") : t("week.regenerateWhole")}
            </button>
          </div>
          <WeekGrid week={weekPlan.data} />
        </>
      )}
    </main>
  );
}
