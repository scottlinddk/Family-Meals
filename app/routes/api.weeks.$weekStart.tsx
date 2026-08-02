import type { Route } from "./+types/api.weeks.$weekStart";
import { requireFamily } from "~/lib/auth";
import { weekPlanRepository } from "~/data/repositories/weekPlanRepository";
import { offerRepository } from "~/data/repositories/offerRepository";
import { generateWeekPlan } from "~/domain/planning/generateWeekPlan";

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

/** POST: generate (or regenerate) the whole week from the current offers. */
export async function action({ request, params }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const headers = new Headers();
  const family = await requireFamily(request, headers);
  const offers = await offerRepository.listCurrentOffers();

  const week = generateWeekPlan({
    familyId: family.id,
    weekStartDate: params.weekStart!,
    offers,
    offerSnapshotId: new Date().toISOString(),
  });

  const saved = await weekPlanRepository.saveWeekPlan(week);
  return new Response(JSON.stringify(saved), {
    headers: { ...Object.fromEntries(headers), "Content-Type": "application/json" },
  });
}
