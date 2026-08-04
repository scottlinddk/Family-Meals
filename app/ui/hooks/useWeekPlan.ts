import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { WeekPlan } from "~/domain/types";

export function weekPlanQueryKey(weekStart: string) {
  return ["week-plan", weekStart] as const;
}

async function fetchWeekPlan(weekStart: string): Promise<WeekPlan | null> {
  const res = await fetch(`/api/weeks/${weekStart}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to load week plan");
  return res.json();
}

export function useWeekPlan(weekStart: string) {
  return useQuery({
    queryKey: weekPlanQueryKey(weekStart),
    queryFn: () => fetchWeekPlan(weekStart),
  });
}

/**
 * Thrown when generation can't proceed because no REMA recipes have been
 * fetched yet. Distinguished from a generic failure so the page can point at
 * the fix ("refresh recipes") instead of showing a dead error.
 */
export class NoRecipesError extends Error {
  constructor() {
    super("no_recipes");
    this.name = "NoRecipesError";
  }
}

export function useGenerateWeekPlan(weekStart: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/weeks/${weekStart}`, { method: "POST" });
      if (res.status === 409) throw new NoRecipesError();
      if (!res.ok) throw new Error("Failed to generate week plan");
      return (await res.json()) as WeekPlan;
    },
    onSuccess: (week) => {
      queryClient.setQueryData(weekPlanQueryKey(weekStart), week);
      // The list is derived from the plan, so it must not survive a regenerate.
      queryClient.invalidateQueries({ queryKey: ["shopping-list", weekStart] });
    },
  });
}
