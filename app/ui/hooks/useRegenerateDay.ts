import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { WeekPlan } from "~/domain/types";
import { weekPlanQueryKey } from "~/ui/hooks/useWeekPlan";

export function useRegenerateDay(weekStart: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dayIndex: number) => {
      const res = await fetch(`/api/weeks/${weekStart}/regenerate-day`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dayIndex }),
      });
      if (!res.ok) throw new Error("Failed to regenerate day");
      return (await res.json()) as WeekPlan;
    },
    onSuccess: (week) => {
      queryClient.setQueryData(weekPlanQueryKey(weekStart), week);
      queryClient.invalidateQueries({ queryKey: ["shopping-list", weekStart] });
    },
  });
}

export function useSwapDayRecipe(weekStart: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ dayIndex, recipeId }: { dayIndex: number; recipeId: string }) => {
      const res = await fetch(`/api/weeks/${weekStart}/swap-day`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dayIndex, recipeId }),
      });
      if (!res.ok) throw new Error("Failed to swap recipe");
      return (await res.json()) as WeekPlan;
    },
    onSuccess: (week) => {
      queryClient.setQueryData(weekPlanQueryKey(weekStart), week);
      queryClient.invalidateQueries({ queryKey: ["shopping-list", weekStart] });
    },
  });
}
