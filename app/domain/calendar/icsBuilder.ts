import ical from "ical-generator";
import type { WeekPlan } from "~/domain/types";
import { getRecipeById } from "~/domain/recipes/recipeCatalog";
import { buildEventUid } from "~/domain/calendar/uid";
import { FAMILY_TIMEZONE } from "~/lib/time";

const DINNER_DURATION_MINUTES = 60;

function describeDay(week: WeekPlan, dayIndex: number): string {
  const day = week.days[dayIndex];
  if (!day) return "";

  const entry = getRecipeById(day.baseRecipeId);
  const lines: string[] = [];

  if (entry) {
    lines.push(`Base dish: ${entry.recipe.title}`);
    lines.push("");
    lines.push("Ingredients:");
    for (const ingredient of entry.recipe.ingredients) {
      lines.push(`- ${ingredient.quantity}${ingredient.unit} ${ingredient.name}`);
    }
    lines.push("");
  }

  lines.push("Adult variant (calorie-minimized):");
  if (day.adultVariant.substitutions.length > 0) {
    for (const sub of day.adultVariant.substitutions) {
      lines.push(`- ${sub.originalIngredient} -> ${sub.substituteIngredient} (${sub.reason})`);
    }
  }
  for (const note of day.adultVariant.portioningNotes) {
    lines.push(`- ${note}`);
  }

  lines.push("");
  lines.push("Child variant (base + calorie-dense addition, unaffected by adult calorie cuts):");
  for (const addition of day.childVariant.additions) {
    lines.push(`- Add ${addition.quantity}${addition.unit} ${addition.name}`);
  }
  for (const note of day.childVariant.textureNotes) {
    lines.push(`- ${note}`);
  }

  return lines.join("\n");
}

function dinnerDateTime(date: string, dinnerTimeLocal: string): Date {
  const [hours, minutes] = dinnerTimeLocal.split(":").map(Number);
  // Interpreted as Europe/Copenhagen local time by the calendar's VTIMEZONE.
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year!, month! - 1, day!, hours!, minutes!));
}

/**
 * Builds the ICS feed for a family's week plan. One VEVENT per day
 * (the shared family dinner) — the infant is intentionally never
 * represented here, since it's excluded from meal planning entirely.
 */
export function buildIcsFeed(week: WeekPlan): string {
  const calendar = ical({
    name: "Family Meals",
    timezone: FAMILY_TIMEZONE,
    prodId: { company: "Family Meals", product: "Meal Plan Calendar" },
  });

  week.days.forEach((day, index) => {
    const entry = getRecipeById(day.baseRecipeId);
    const start = dinnerDateTime(day.date, entry?.recipe.dinnerTimeLocal ?? "18:00");
    const end = new Date(start.getTime() + DINNER_DURATION_MINUTES * 60_000);

    calendar.createEvent({
      id: buildEventUid({ familyId: week.familyId, date: day.date, mealSlot: day.mealSlot }),
      sequence: day.sequence,
      start,
      end,
      timezone: FAMILY_TIMEZONE,
      summary: entry?.recipe.title ?? "Family dinner",
      description: describeDay(week, index),
      lastModified: new Date(day.editedAt),
    });
  });

  return calendar.toString();
}
