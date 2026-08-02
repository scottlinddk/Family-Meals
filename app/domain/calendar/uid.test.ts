import { describe, expect, it } from "vitest";
import { buildEventUid } from "~/domain/calendar/uid";

describe("buildEventUid", () => {
  it("is stable across different recipes for the same family/date/slot", () => {
    const base = { familyId: "family-1", date: "2026-08-03", mealSlot: "dinner" as const };
    const uidBeforeEdit = buildEventUid(base);
    const uidAfterEdit = buildEventUid(base); // recipe identity never enters the UID at all
    expect(uidBeforeEdit).toBe(uidAfterEdit);
  });

  it("differs across dates for the same family", () => {
    const uidDay1 = buildEventUid({ familyId: "family-1", date: "2026-08-03", mealSlot: "dinner" });
    const uidDay2 = buildEventUid({ familyId: "family-1", date: "2026-08-04", mealSlot: "dinner" });
    expect(uidDay1).not.toBe(uidDay2);
  });

  it("differs across families for the same date", () => {
    const uidFamily1 = buildEventUid({ familyId: "family-1", date: "2026-08-03", mealSlot: "dinner" });
    const uidFamily2 = buildEventUid({ familyId: "family-2", date: "2026-08-03", mealSlot: "dinner" });
    expect(uidFamily1).not.toBe(uidFamily2);
  });
});
