import type { DayPlan } from "~/domain/types";
import { getRecipeById } from "~/domain/recipes/recipeCatalog";
import { AdultVariantPanel, ChildVariantPanel } from "~/ui/components/VariantPanel";
import { RegenerateDayButton } from "~/ui/components/RegenerateDayButton";

export function DayCard({ day, weekStart, dayIndex }: { day: DayPlan; weekStart: string; dayIndex: number }) {
  const entry = getRecipeById(day.baseRecipeId);
  const weekday = new Date(`${day.date}T00:00:00`).toLocaleDateString("en-GB", { weekday: "long" });

  return (
    <article className="rounded-lg border border-gray-200 p-4 shadow-sm">
      <header className="mb-2 flex items-baseline justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">
            {weekday} · {day.date}
          </p>
          <h3 className="text-lg font-semibold">{entry?.recipe.title ?? day.baseRecipeId}</h3>
        </div>
        <RegenerateDayButton weekStart={weekStart} dayIndex={dayIndex} />
      </header>

      {entry && (
        <ul className="mb-3 flex flex-wrap gap-2 text-xs text-gray-500">
          {entry.recipe.tags.map((tag) => (
            <li key={tag} className="rounded-full bg-gray-100 px-2 py-0.5">
              {tag}
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <AdultVariantPanel variant={day.adultVariant} />
        <ChildVariantPanel variant={day.childVariant} />
      </div>
    </article>
  );
}
