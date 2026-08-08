import { describe, expect, it } from "vitest";
import { normalizeRecipeSnapshot, toRecipeSnapshot } from "~/domain/recipes/recipeSnapshot";
import type { ExternalRecipe, Offer } from "~/domain/types";

function offer(name: string): Offer {
  return {
    storeId: "rema1000",
    memberOnly: false,
    name,
    unitSizeFrom: 1,
    unitSizeTo: 1,
    unitSymbol: "stk",
    price: 10,
    currencyCode: "DKK",
    unitPrice: 10,
    baseUnit: "stk",
    departmentSlug: "groceries_discount",
    validFrom: "2026-08-01T00:00:00Z",
    validUntil: "2026-08-08T00:00:00Z",
  };
}

const recipe: ExternalRecipe = {
  id: "kylling-i-karry",
  title: "Kylling i karry",
  source: "rema1000",
  url: "https://madogdrikke.rema1000.dk/opskrifter/kylling-i-karry",
  description: "En hurtig karryret.",
  ingredients: ["500 g kyllingebryst", "1 dl fløde", "2 spsk karry"],
  instructions: ["Skær kyllingen i tern.", "Steg den gylden."],
  servings: 4,
  totalTimeMinutes: 35,
};

describe("toRecipeSnapshot", () => {
  it("carries the full recipe so the day can be cooked from the app", () => {
    const snapshot = toRecipeSnapshot(recipe);

    expect(snapshot.description).toBe("En hurtig karryret.");
    expect(snapshot.servings).toBe(4);
    expect(snapshot.totalTimeMinutes).toBe(35);
    expect(snapshot.ingredientLines).toEqual(recipe.ingredients);
    expect(snapshot.instructionLines).toEqual(recipe.instructions);
  });

  it("keeps the source URL so the original recipe stays reachable", () => {
    expect(toRecipeSnapshot(recipe).url).toBe(recipe.url);
  });

  it("freezes which ingredients were on offer when the day was planned", () => {
    const snapshot = toRecipeSnapshot(recipe, [offer("REMA 1000 Dansk kyllingebrystfilet")]);
    expect(snapshot.offerIngredientLines).toEqual(["500 g kyllingebryst"]);
  });

  it("marks nothing on offer when no offers are supplied", () => {
    expect(toRecipeSnapshot(recipe).offerIngredientLines).toEqual([]);
  });
});

describe("normalizeRecipeSnapshot", () => {
  it("defaults the list fields a partial stored snapshot is missing", () => {
    // The shape migration 0003 backfilled onto pre-snapshot day plans: it has
    // no instructionLines at all.
    const snapshot = normalizeRecipeSnapshot({
      title: "kylling-i-karry",
      source: "catalog",
      tags: [],
      ingredientLines: [],
    });

    expect(snapshot.instructionLines).toEqual([]);
    expect(snapshot.ingredientLines).toEqual([]);
  });

  it("survives a snapshot with nothing in it", () => {
    const snapshot = normalizeRecipeSnapshot({});

    expect(snapshot.tags).toEqual([]);
    expect(snapshot.ingredientLines).toEqual([]);
    expect(snapshot.instructionLines).toEqual([]);
    expect(snapshot.title).toBe("");
  });

  it("leaves a complete snapshot untouched", () => {
    const complete = toRecipeSnapshot(recipe);
    expect(normalizeRecipeSnapshot(complete)).toEqual(complete);
  });
});
