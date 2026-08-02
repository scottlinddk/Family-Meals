import type { Route } from "./+types/calendar.$token[.]ics";
import { familyRepository } from "~/data/repositories/familyRepository";
import { weekPlanRepository } from "~/data/repositories/weekPlanRepository";
import { buildIcsFeed } from "~/domain/calendar/icsBuilder";
import { mondayOf, todayIso, addDays } from "~/lib/time";
import type { WeekPlan } from "~/domain/types";

/**
 * Live ICS subscription feed. Computed fresh from Postgres on every
 * request (never a build-time artifact), so edits/regenerations in the web
 * UI show up the next time the subscribing calendar app refreshes this URL.
 * Authenticated by the opaque `:token` path segment — see lib/tokens.ts and
 * the plan's "Hosting / Access control" section for why a bearer-token URL
 * is the right model for webcal subscriptions (no interactive login).
 */
export async function loader({ params }: Route.LoaderArgs) {
  const token = params.token;
  const family = token ? await familyRepository.getByCalendarToken(token) : undefined;

  if (!family) {
    return new Response("Not found", { status: 404 });
  }

  // Serve the current week plus next week if it already exists, so the
  // feed doesn't go empty on Sunday night before next week is generated.
  const thisWeekStart = mondayOf(todayIso());
  const nextWeekStart = addDays(thisWeekStart, 7);
  const [thisWeek, nextWeek] = await Promise.all([
    weekPlanRepository.getWeekPlan(family.id, thisWeekStart),
    weekPlanRepository.getWeekPlan(family.id, nextWeekStart),
  ]);

  const weeks = [thisWeek, nextWeek].filter((week) => week !== undefined);
  const ics = buildIcsFeed(weeks.length > 0 ? mergeWeeks(weeks) : emptyWeek(family.id, thisWeekStart));

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="family-meals.ics"',
      // Calendar apps poll on their own schedule; a short cache is just to
      // absorb bursts of refresh requests, not to delay real updates.
      "Cache-Control": "public, max-age=300",
    },
  });
}

function mergeWeeks(weeks: WeekPlan[]): WeekPlan {
  return { ...weeks[0]!, days: weeks.flatMap((week) => week.days) };
}

function emptyWeek(familyId: string, weekStartDate: string): WeekPlan {
  return {
    familyId,
    weekStartDate,
    days: [],
    generatedFrom: { offerSnapshotId: "none", generatorVersion: "none" },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
