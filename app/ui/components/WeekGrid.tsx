import type { WeekPlan } from "~/domain/types";
import { DayCard } from "~/ui/components/DayCard";

export function WeekGrid({ week }: { week: WeekPlan }) {
  return (
    <div className="grid gap-4">
      {week.days.map((day, index) => (
        <DayCard key={day.date} day={day} weekStart={week.weekStartDate} dayIndex={index} />
      ))}
    </div>
  );
}
