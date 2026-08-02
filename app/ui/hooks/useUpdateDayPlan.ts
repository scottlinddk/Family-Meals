import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { WeekPlan } from "~/domain/types";
import type { DayPlanEdit } from "~/domain/planning/editDayPlan";
import { weekPlanQueryKey } from "~/ui/hooks/useWeekPlan";

export function useUpdateDayPlan(weekStart: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ dayIndex, edit }: { dayIndex: number; edit: DayPlanEdit }) => {
      const res = await fetch(`/api/weeks/${weekStart}/day/${dayIndex}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(edit),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to update day");
      }
      return (await res.json()) as WeekPlan;
    },
    onSuccess: (week) => {
      queryClient.setQueryData(weekPlanQueryKey(weekStart), week);
    },
  });
}
