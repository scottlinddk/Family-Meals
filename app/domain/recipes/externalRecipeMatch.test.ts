import { describe, expect, it } from "vitest";
import { rankExternalRecipesByOffers } from "~/domain/recipes/externalRecipeMatch";
import type { ExternalRecipe, Offer } from "~/domain/types";

function offer(name: string): Offer {
  return {
    name,
    unitSizeFrom: 1,
    unitSizeTo: 1,
    unitSymbol: "stk",
    price: 10,
    currencyCode: "DKK",
    unitPrice: 10,
    baseUnit: "stk",
    departmentSlug: "meat-and-fish",
    validFrom: "2026-08-01T00:00:00Z",
    validUntil: "2026-08-08T00:00:00Z",
  };
}

function recipe(id: string, ingredients: string[]): ExternalRecipe {
  return { id, title: id, url: `https://x/opskrifter/${id}`, ingredients, instructions: [] };
}

describe("rankExternalRecipesByOffers", () => {
  it("ranks recipes with more offer-matching ingredients first", () => {
    const offers = [offer("REMA 1000 Kyllingebryst"), offer("Broccoli")];
    const recipes = [
      recipe("no-match", ["Pasta", "Fløde"]),
      recipe("one-match", ["Kyllingebryst", "Ris"]),
      recipe("two-match", ["Kyllingebryst", "Broccoli", "Ris"]),
    ];

    const ranked = rankExternalRecipesByOffers(recipes, offers);

    expect(ranked.map((r) => r.recipe.id)).toEqual(["two-match", "one-match", "no-match"]);
    expect(ranked[0]?.score).toBe(2);
    expect(ranked[0]?.matchedOfferNames).toEqual(["REMA 1000 Kyllingebryst", "Broccoli"]);
    expect(ranked[2]?.score).toBe(0);
  });

  it("reports which ingredient each offer covers, for in-app highlighting", () => {
    const ranked = rankExternalRecipesByOffers(
      [recipe("r", ["500 g hakket oksekød", "1 dl fløde"])],
      [offer("Friland Hakket dansk oksekød 8-12%")],
    );

    expect(ranked[0]?.matchedIngredients).toEqual([
      {
        ingredient: "500 g hakket oksekød",
        offerNames: ["Friland Hakket dansk oksekød 8-12%"],
        price: 10,
      },
    ]);
  });

  it("breaks ties on coverage, preferring the recipe where more of the shop is discounted", () => {
    const offers = [offer("Kyllingebryst"), offer("Broccoli")];
    const ranked = rankExternalRecipesByOffers(
      [
        recipe("long", ["Kyllingebryst", "Broccoli", "Ris", "Fløde", "Karry", "Løg"]),
        recipe("short", ["Kyllingebryst", "Broccoli", "Ris"]),
      ],
      offers,
    );

    expect(ranked.map((r) => r.recipe.id)).toEqual(["short", "long"]);
    expect(ranked[0]?.score).toBe(2);
    expect(ranked[0]?.coverage).toBeCloseTo(2 / 3);
  });

  it("scores 0 when a recipe has no scraped ingredients", () => {
    // Guards the regression that silently disabled offer matching entirely:
    // the whole cache was stored with empty ingredient arrays.
    const ranked = rankExternalRecipesByOffers([recipe("empty", [])], [offer("Broccoli")]);
    expect(ranked[0]?.score).toBe(0);
    expect(ranked[0]?.coverage).toBe(0);
  });
});
