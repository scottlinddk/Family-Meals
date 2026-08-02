import type { Route } from "./+types/api.weeks.$weekStart.day.$day";
import { requireFamily } from "~/lib/auth";
import { weekPlanRepository } from "~/data/repositories/weekPlanRepository";
import { editDayPlan, type DayPlanEdit } from "~/domain/planning/editDayPlan";

/** PATCH: manually edit one day's variant details (portioning notes, child addition, etc). */
export async function action({ request, params }: Route.ActionArgs) {
  if (request.method !== "PATCH") {
    return new Response("Method not allowed", { status: 405 });
  }

  const headers = new Headers();
  const family = await requireFamily(request, headers);
  const dayIndex = Number(params.day);
  const edit = (await request.json()) as DayPlanEdit;

  const week = await weekPlanRepository.getWeekPlan(family.id, params.weekStart!);
  if (!week) {
    return new Response(JSON.stringify({ error: "not_found" }), {
      status: 404,
      headers: { ...Object.fromEntries(headers), "Content-Type": "application/json" },
    });
  }

  try {
    const updated = editDayPlan(week, dayIndex, edit);
    const saved = await weekPlanRepository.saveWeekPlan(updated);
    return new Response(JSON.stringify(saved), {
      headers: { ...Object.fromEntries(headers), "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 400,
      headers: { ...Object.fromEntries(headers), "Content-Type": "application/json" },
    });
  }
}
