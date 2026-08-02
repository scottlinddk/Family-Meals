import { useRegenerateDay } from "~/ui/hooks/useRegenerateDay";

export function RegenerateDayButton({ weekStart, dayIndex }: { weekStart: string; dayIndex: number }) {
  const regenerate = useRegenerateDay(weekStart);

  return (
    <button
      type="button"
      onClick={() => regenerate.mutate(dayIndex)}
      disabled={regenerate.isPending}
      className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-50"
    >
      {regenerate.isPending ? "Regenerating..." : "Regenerate this day"}
    </button>
  );
}
