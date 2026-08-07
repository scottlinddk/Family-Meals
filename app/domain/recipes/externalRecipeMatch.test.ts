import { describe, expect, it } from "vitest";
import { rankExternalRecipesByOffers } from "~/domain/recipes/externalRecipeMatch";
import type { ExternalRecipe, Offer } from "~/domain/types";

function offer(name: string, validity?: { validFrom: string; validUntil: string }): Offer {
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
    departmentSlug: "meat-and-fish",
    validFrom: validity?.validFrom ?? "2026-08-01T22:00:00+0000",
    validUntil: validity?.validUntil ?? "2026-08-08T21:59:59+0000",
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
        weekendOnlyOfferNames: [],
        price: 10,
      },
    ]);
  });

  it("flags matched offers that only run part of the week", () => {
    const weekendOffer = offer("Naturli' Drik eller kokosvand", {
      validFrom: "2026-08-12T22:00:00+0000", // Thursday
      validUntil: "2026-08-15T21:59:59+0000", // Saturday
    });

    const ranked = rankExternalRecipesByOffers([recipe("r", ["Naturli' Drik"])], [weekendOffer]);

    expect(ranked[0]?.matchedOfferNames).toEqual(["Naturli' Drik eller kokosvand"]);
    expect(ranked[0]?.weekendOnlyOfferNames).toEqual(["Naturli' Drik eller kokosvand"]);
    expect(ranked[0]?.matchedIngredients[0]?.weekendOnlyOfferNames).toEqual([
      "Naturli' Drik eller kokosvand",
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
