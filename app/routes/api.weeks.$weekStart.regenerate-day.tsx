import type { Route } from "./+types/api.weeks.$weekStart.regenerate-day";
import { requireFamily } from "~/lib/auth";
import { weekPlanRepository } from "~/data/repositories/weekPlanRepository";
import { offerRepository } from "~/data/repositories/offerRepository";
import { externalRecipeRepository } from "~/data/repositories/externalRecipeRepository";
import { regenerateDay } from "~/domain/planning/regenerateDay";

/** POST { dayIndex: number }: regenerate a single day, picking a different recipe. */
export async function action({ request, params }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const headers = new Headers();
  const family = await requireFamily(request, headers);
  const { dayIndex } = (await request.json()) as { dayIndex: number };

  const week = await weekPlanRepository.getWeekPlan(family.id, params.weekStart!);
  if (!week) {
    return new Response(JSON.stringify({ error: "not_found" }), {
      status: 404,
      headers: { ...Object.fromEntries(headers), "Content-Type": "application/json" },
    });
  }

  const [offers, externalRecipes] = await Promise.all([
    offerRepository.listCurrentOffers(family.id),
    externalRecipeRepository.listAll(),
  ]);
  const updated = regenerateDay(week, dayIndex, offers, externalRecipes);
  const saved = await weekPlanRepository.saveWeekPlan(updated);

  return new Response(JSON.stringify(saved), {
    headers: { ...Object.fromEntries(headers), "Content-Type": "application/json" },
  });
}
