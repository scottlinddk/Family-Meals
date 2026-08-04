import { describe, expect, it } from "vitest";
import type { DayPlan, Offer, WeekPlan } from "~/domain/types";
import { buildShoppingList } from "~/domain/planning/shoppingList";

function day(date: string, title: string, ingredientLines: string[]): DayPlan {
  return {
    date,
    mealSlot: "dinner",
    baseRecipeId: title,
    recipeSnapshot: {
      title,
      source: "external",
      tags: [],
      ingredientLines,
      instructionLines: [],
    },
    adultVariant: { baseRecipeId: title, substitutions: [], portioningNotes: [], curated: false },
    childVariant: {
      baseRecipeId: title,
      additions: [],
      textureNotes: [],
      saltSugarNotes: [],
      curated: false,
    },
    isManualOverride: false,
    editedAt: "2026-08-03T10:00:00.000Z",
    sequence: 0,
  };
}

function week(days: DayPlan[]): WeekPlan {
  return {
    familyId: "family-1",
    weekStartDate: "2026-08-03",
    days,
    generatedFrom: { offerSnapshotId: "snapshot-1", generatorVersion: "test" },
    createdAt: "2026-08-03T10:00:00.000Z",
    updatedAt: "2026-08-03T10:00:00.000Z",
  };
}

function offer(name: string, departmentSlug: string): Offer {
  return {
    name,
    unitSizeFrom: 400,
    unitSizeTo: 400,
    unitSymbol: "g",
    price: 30,
    currencyCode: "DKK",
    unitPrice: 75,
    baseUnit: "kilogram",
    departmentSlug,
    validFrom: "2026-08-03T00:00:00.000Z",
    validUntil: "2026-08-09T00:00:00.000Z",
  };
}

describe("buildShoppingList", () => {
  it("merges the same product across days, keeping both wordings and both days", () => {
    const list = buildShoppingList(
      week([
        day("2026-08-03", "Pasta", ["2 løg", "500 g hakket oksekød"]),
        day("2026-08-04", "Suppe", ["1 løg, finthakket"]),
      ]),
      [],
    );

    const onions = list.sections.flatMap((s) => s.items).find((item) => item.label === "2 løg");
    expect(onions).toBeDefined();
    expect(onions!.variants).toEqual(["2 løg", "1 løg, finthakket"]);
    expect(onions!.dates).toEqual(["2026-08-03", "2026-08-04"]);
    expect(onions!.recipeTitles).toEqual(["Pasta", "Suppe"]);
    expect(list.itemCount).toBe(2);
  });

  it("keeps distinct products apart even when one name contains the other", () => {
    const list = buildShoppingList(
      week([day("2026-08-03", "Pasta", ["2 løg", "3 fed hvidløg"])]),
      [],
    );

    expect(list.itemCount).toBe(2);
  });

  it("groups by the department of the matching offer and marks it as on offer", () => {
    const offers = [offer("Friland Hakket dansk oksekød 8-12%", "meat-and-fish"), offer("Broccoli", "fruit-and-veg")];
    const list = buildShoppingList(
      week([day("2026-08-03", "Pasta", ["500 g hakket oksekød", "1 broccoli", "salt"])]),
      offers,
    );

    expect(list.sections.map((s) => s.departmentSlug)).toEqual(["fruit-and-veg", "meat-and-fish", null]);
    expect(list.onOfferCount).toBe(2);

    const beef = list.sections.find((s) => s.departmentSlug === "meat-and-fish")!.items[0]!;
    expect(beef.offerNames).toEqual(["Friland Hakket dansk oksekød 8-12%"]);

    // Nothing matched "salt", so it lands in the un-departmented section last.
    expect(list.sections.at(-1)!.items.map((i) => i.label)).toEqual(["salt"]);
  });

  it("orders departments as a walk through the store, not alphabetically", () => {
    const offers = [
      offer("Kyllingebryst", "meat-and-fish"),
      offer("Rugbrød", "bread-and-bakery"),
      offer("Gulerødder", "fruit-and-veg"),
    ];
    const list = buildShoppingList(
      week([day("2026-08-03", "Ret", ["500 g kyllingebryst", "1 rugbrød", "4 gulerødder"])]),
      offers,
    );

    expect(list.sections.map((s) => s.departmentSlug)).toEqual([
      "fruit-and-veg",
      "bread-and-bakery",
      "meat-and-fish",
    ]);
  });

  it("returns an empty list for a week whose recipes carry no ingredients", () => {
    const list = buildShoppingList(week([day("2026-08-03", "Tom", [])]), []);

    expect(list.sections).toEqual([]);
    expect(list.itemCount).toBe(0);
    expect(list.onOfferCount).toBe(0);
  });
});
