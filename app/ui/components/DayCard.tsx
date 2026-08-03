import type { DayPlan } from "~/domain/types";
import { getRecipeById } from "~/domain/recipes/recipeCatalog";
import { AdultVariantPanel, ChildVariantPanel } from "~/ui/components/VariantPanel";
import { RegenerateDayButton } from "~/ui/components/RegenerateDayButton";
import { Tag } from "~/ui/components/ui/Tag";
import { Card, CardKicker } from "~/ui/components/ui/Card";

export function DayCard({ day, weekStart, dayIndex }: { day: DayPlan; weekStart: string; dayIndex: number }) {
  const entry = getRecipeById(day.baseRecipeId);
  const weekday = new Date(`${day.date}T00:00:00`).toLocaleDateString("da-DK", { weekday: "long" });

  return (
    <Card as="article" className="p-4">
      <header className="mb-1 flex items-start justify-between gap-2">
        <div>
          <CardKicker>
            {weekday} · {day.date}
          </CardKicker>
          <h3 className="mt-1 text-2xl">{entry?.recipe.title ?? day.baseRecipeId}</h3>
        </div>
        <RegenerateDayButton weekStart={weekStart} dayIndex={dayIndex} />
      </header>

      {entry && (
        <ul className="mb-2 flex flex-wrap gap-1.5">
          {entry.recipe.tags.map((tag) => (
            <li key={tag}>
              <Tag>{tag}</Tag>
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <AdultVariantPanel variant={day.adultVariant} />
        <ChildVariantPanel variant={day.childVariant} />
      </div>
    </Card>
  );
}
