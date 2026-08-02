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
  return { id, title: id, url: `https://x/opskrifter/${id}`, ingredients };
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
});
