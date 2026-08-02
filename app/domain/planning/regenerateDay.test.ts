import { describe, expect, it } from "vitest";
import { generateWeekPlan } from "~/domain/planning/generateWeekPlan";
import { regenerateDay } from "~/domain/planning/regenerateDay";
import { buildIcsFeed } from "~/domain/calendar/icsBuilder";
import { buildEventUid } from "~/domain/calendar/uid";
import { getRecipeById } from "~/domain/recipes/recipeCatalog";

describe("regenerateDay", () => {
  it("bumps sequence and keeps the same VEVENT UID after regenerating a day", () => {
    const week = generateWeekPlan({
      familyId: "family-1",
      weekStartDate: "2026-08-03",
      offers: [],
      offerSnapshotId: "snapshot-1",
    });

    const originalRecipeId = week.days[2]!.baseRecipeId;
    const updated = regenerateDay(week, 2, []);

    expect(updated.days[2]!.baseRecipeId).not.toBe(originalRecipeId);
    expect(updated.days[2]!.sequence).toBe(week.days[2]!.sequence + 1);

    const icsBefore = buildIcsFeed(week);
    const icsAfter = buildIcsFeed(updated);
    const expectedUid = buildEventUid({
      familyId: "family-1",
      date: week.days[2]!.date,
      mealSlot: "dinner",
    });

    expect(icsBefore).toContain(expectedUid);
    expect(icsAfter).toContain(expectedUid);
  });

  it("never repeats the same protein more than twice across a 7-day plan", () => {
    const week = generateWeekPlan({
      familyId: "family-1",
      weekStartDate: "2026-08-03",
      offers: [],
      offerSnapshotId: "snapshot-1",
    });

    const counts = new Map<string, number>();
    for (const day of week.days) {
      const protein = getRecipeById(day.baseRecipeId)!.recipe.proteinType;
      counts.set(protein, (counts.get(protein) ?? 0) + 1);
    }
    for (const count of counts.values()) {
      expect(count).toBeLessThanOrEqual(2);
    }
  });
});
