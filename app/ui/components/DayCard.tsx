import type { DayPlan } from "~/domain/types";
import { AdultVariantPanel, ChildVariantPanel } from "~/ui/components/VariantPanel";
import { RegenerateDayButton } from "~/ui/components/RegenerateDayButton";
import { Card, CardKicker } from "~/ui/components/ui/Card";

export function DayCard({ day, weekStart, dayIndex }: { day: DayPlan; weekStart: string; dayIndex: number }) {
  const weekday = new Date(`${day.date}T00:00:00`).toLocaleDateString("da-DK", { weekday: "long" });

  return (
    <Card as="article" className="p-4">
      <header className="mb-1 flex items-start justify-between gap-2">
        <div className="flex items-start gap-3">
          {day.recipeSnapshot.imageUrl && (
            <img
              src={day.recipeSnapshot.imageUrl}
              alt=""
              className="h-14 w-14 shrink-0 rounded-md object-cover"
            />
          )}
          <div>
            <CardKicker>
              {weekday} · {day.date}
            </CardKicker>
            {day.recipeSnapshot.url ? (
              <a
                href={day.recipeSnapshot.url}
                target="_blank"
                rel="noreferrer"
                className="mt-1 block text-2xl hover:underline"
              >
                {day.recipeSnapshot.title}
              </a>
            ) : (
              <h3 className="mt-1 text-2xl">{day.recipeSnapshot.title}</h3>
            )}
          </div>
        </div>
        <RegenerateDayButton weekStart={weekStart} dayIndex={dayIndex} />
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <AdultVariantPanel variant={day.adultVariant} />
        <ChildVariantPanel variant={day.childVariant} />
      </div>
    </Card>
  );
}
