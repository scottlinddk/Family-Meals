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

export function useGenerateWeekPlan(weekStart: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/weeks/${weekStart}`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to generate week plan");
      return (await res.json()) as WeekPlan;
    },
    onSuccess: (week) => {
      queryClient.setQueryData(weekPlanQueryKey(weekStart), week);
    },
  });
}
