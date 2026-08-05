import type { Route } from "./+types/weeks.$weekStart.day.$day.cook";
import { useWeekPlan } from "~/ui/hooks/useWeekPlan";
import { CookMode, CookModeFallback } from "~/ui/components/CookMode";

/**
 * Cook mode for a planned day. Unlike the recipe version it also carries the
 * adult/child variants, which are the whole point of the plan and are needed
 * exactly at the moment the food reaches the plates — so they close the
 * sequence as a serving step.
 */
export default function DayCookPage({ params }: Route.ComponentProps) {
  const weekStart = params.weekStart!;
  const dayIndex = Number(params.day);
  const exitTo = `/weeks/${weekStart}/day/${dayIndex}`;
  const weekPlan = useWeekPlan(weekStart);
  const day = weekPlan.data?.days[dayIndex];

  if (!day) {
    return <CookModeFallback exitTo={exitTo} loading={weekPlan.isLoading} />;
  }

  const snapshot = day.recipeSnapshot;

  return (
    <CookMode
      title={snapshot.title}
      exitTo={exitTo}
      ingredientLines={snapshot.ingredientLines}
      instructionLines={snapshot.instructionLines}
      offerIngredientLines={snapshot.offerIngredientLines}
      servings={snapshot.servings}
      totalTimeMinutes={snapshot.totalTimeMinutes}
      url={snapshot.url}
      adultVariant={day.adultVariant}
      childVariant={day.childVariant}
    />
  );
}
