import type { Route } from "./+types/api.weeks.$weekStart.swap-day";
import { requireFamily } from "~/lib/auth";
import { weekPlanRepository } from "~/data/repositories/weekPlanRepository";
import { externalRecipeRepository } from "~/data/repositories/externalRecipeRepository";
import { swapDayRecipe } from "~/domain/planning/regenerateDay";

/** POST { dayIndex: number, recipeId: string }: swap a day to a specific recipe the user chose. */
export async function action({ request, params }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const headers = new Headers();
  const family = await requireFamily(request, headers);
  const { dayIndex, recipeId } = (await request.json()) as { dayIndex: number; recipeId: string };

  const week = await weekPlanRepository.getWeekPlan(family.id, params.weekStart!);
  if (!week) {
    return new Response(JSON.stringify({ error: "not_found" }), {
      status: 404,
      headers: { ...Object.fromEntries(headers), "Content-Type": "application/json" },
    });
  }

  const externalRecipes = await externalRecipeRepository.listAll();
  const updated = swapDayRecipe(week, dayIndex, recipeId, externalRecipes);
  const saved = await weekPlanRepository.saveWeekPlan(updated);

  return new Response(JSON.stringify(saved), {
    headers: { ...Object.fromEntries(headers), "Content-Type": "application/json" },
  });
}
