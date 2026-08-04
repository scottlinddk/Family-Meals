import type { Route } from "./+types/api.weeks.$weekStart";
import { requireFamily } from "~/lib/auth";
import { weekPlanRepository } from "~/data/repositories/weekPlanRepository";
import { offerRepository } from "~/data/repositories/offerRepository";
import { externalRecipeRepository } from "~/data/repositories/externalRecipeRepository";
import { generateWeekPlan } from "~/domain/planning/generateWeekPlan";
import { addDays } from "~/lib/time";

/** GET: fetch the week plan (404 if not generated yet). */
export async function loader({ request, params }: Route.LoaderArgs) {
  const headers = new Headers();
  const family = await requireFamily(request, headers);
  const week = await weekPlanRepository.getWeekPlan(family.id, params.weekStart!);

  if (!week) {
    return new Response(JSON.stringify({ error: "not_found" }), {
      status: 404,
      headers: { ...Object.fromEntries(headers), "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify(week), {
    headers: { ...Object.fromEntries(headers), "Content-Type": "application/json" },
  });
}

/** POST: generate (or regenerate) the whole week from the offers valid during it. */
export async function action({ request, params }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const headers = new Headers();
  const family = await requireFamily(request, headers);
  const weekStart = params.weekStart!;
  const jsonHeaders = { ...Object.fromEntries(headers), "Content-Type": "application/json" };

  // Rank against the offers that apply during the week being planned, not
  // whatever happens to be valid the moment the button is clicked.
  const [snapshot, offers, externalRecipes, recentRecipeIds, previousWeek] = await Promise.all([
    offerRepository.getLatestSnapshot(family.id),
    offerRepository.listOffersValidDuring(
      family.id,
      new Date(`${weekStart}T00:00:00Z`),
      new Date(`${addDays(weekStart, 6)}T23:59:59Z`),
    ),
    externalRecipeRepository.listAll(),
    weekPlanRepository.listRecentRecipeIds(family.id, weekStart),
    weekPlanRepository.getWeekPlan(family.id, weekStart),
  ]);

  if (externalRecipes.length === 0) {
    return new Response(JSON.stringify({ error: "no_recipes" }), { status: 409, headers: jsonHeaders });
  }

  const week = generateWeekPlan({
    familyId: family.id,
    weekStartDate: weekStart,
    offers,
    offerSnapshotId: offers.length > 0 ? (snapshot?.id ?? null) : null,
    externalRecipes,
    recentRecipeIds,
    previousWeek,
  });

  const saved = await weekPlanRepository.saveWeekPlan(week);
  return new Response(JSON.stringify(saved), { headers: jsonHeaders });
}
