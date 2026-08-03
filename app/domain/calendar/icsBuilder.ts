import ical from "ical-generator";
import type { WeekPlan } from "~/domain/types";
import { buildEventUid } from "~/domain/calendar/uid";
import { FAMILY_TIMEZONE } from "~/lib/time";

const DINNER_DURATION_MINUTES = 60;
const DEFAULT_DINNER_TIME_LOCAL = "18:00";

function describeDay(week: WeekPlan, dayIndex: number): string {
  const day = week.days[dayIndex];
  if (!day) return "";

  const lines: string[] = [];

  lines.push(`Base dish: ${day.recipeSnapshot.title}`);
  if (day.recipeSnapshot.url) lines.push(`Recipe: ${day.recipeSnapshot.url}`);
  lines.push("");
  lines.push("Ingredients:");
  for (const line of day.recipeSnapshot.ingredientLines) {
    lines.push(`- ${line}`);
  }
  lines.push("");

  lines.push("Adult variant (calorie-minimized):");
  if (!day.adultVariant.curated) lines.push("- No curated calorie guidance available for this recipe.");
  for (const sub of day.adultVariant.substitutions) {
    lines.push(`- ${sub.originalIngredient} -> ${sub.substituteIngredient} (${sub.reason})`);
  }
  for (const note of day.adultVariant.portioningNotes) {
    lines.push(`- ${note}`);
  }

  lines.push("");
  lines.push("Child variant (base + calorie-dense addition, unaffected by adult calorie cuts):");
  if (!day.childVariant.curated) lines.push("- No curated calorie-dense addition available for this recipe.");
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
    const start = dinnerDateTime(day.date, DEFAULT_DINNER_TIME_LOCAL);
    const end = new Date(start.getTime() + DINNER_DURATION_MINUTES * 60_000);

    calendar.createEvent({
      id: buildEventUid({ familyId: week.familyId, date: day.date, mealSlot: day.mealSlot }),
      sequence: day.sequence,
      start,
      end,
      timezone: FAMILY_TIMEZONE,
      summary: day.recipeSnapshot.title,
      description: describeDay(week, index),
      lastModified: new Date(day.editedAt),
    });
  });

  return calendar.toString();
}
