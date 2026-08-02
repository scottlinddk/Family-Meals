import type { DayPlan } from "~/domain/types";
import { getRecipeById } from "~/domain/recipes/recipeCatalog";
import { AdultVariantPanel, ChildVariantPanel } from "~/ui/components/VariantPanel";
import { RegenerateDayButton } from "~/ui/components/RegenerateDayButton";
import { Chip } from "~/ui/components/ui/Chip";
import { Card } from "~/ui/components/ui/Card";

export function DayCard({ day, weekStart, dayIndex }: { day: DayPlan; weekStart: string; dayIndex: number }) {
  const entry = getRecipeById(day.baseRecipeId);
  const weekday = new Date(`${day.date}T00:00:00`).toLocaleDateString("en-GB", { weekday: "long" });

  return (
    <Card as="article">
      <header className="mb-3 flex items-baseline justify-between gap-2">
        <div>
          <p className="font-mono text-[11px] tracking-[0.14em] text-muted uppercase">
            {weekday} · {day.date}
          </p>
          <h3 className="font-display text-3xl leading-none">{entry?.recipe.title ?? day.baseRecipeId}</h3>
        </div>
        <RegenerateDayButton weekStart={weekStart} dayIndex={dayIndex} />
      </header>

      {entry && (
        <ul className="mb-4 flex flex-wrap gap-2">
          {entry.recipe.tags.map((tag) => (
            <li key={tag}>
              <Chip>{tag}</Chip>
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
