import { describe, expect, it } from "vitest";
import { offerOverrideKey, rankExternalRecipesByOffers } from "~/domain/recipes/externalRecipeMatch";
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

  it("omits an ingredient nothing was ever on offer for, unlike a flagged-away one", () => {
    // Contrast case for the flagged-pairings tests below: a bare ingredient
    // with no match at all is still left out of the list entirely, since it
    // was never a row a family could flag in the first place.
    const ranked = rankExternalRecipesByOffers([recipe("r", ["1 dl fløde"])], [offer("Broccoli")]);
    expect(ranked[0]?.matchedIngredients).toEqual([]);
  });

  it("scores 0 when a recipe has no scraped ingredients", () => {
    // Guards the regression that silently disabled offer matching entirely:
    // the whole cache was stored with empty ingredient arrays.
    const ranked = rankExternalRecipesByOffers([recipe("empty", [])], [offer("Broccoli")]);
    expect(ranked[0]?.score).toBe(0);
    expect(ranked[0]?.coverage).toBe(0);
  });

  it("lists a bundled offer once, however many rows carry that name", () => {
    // The same product is imported once per snapshot and per selected store,
    // which showed the shopper the same offer name two and three times over.
    const ranked = rankExternalRecipesByOffers(
      [recipe("dupes", ["1 stk squash"])],
      [offer("Squash"), offer("Squash"), offer("Squash")],
    );
    expect(ranked[0]?.matchedIngredients[0]?.offerNames).toEqual(["Squash"]);
  });
});

/**
 * Excluding the pairings a family has flagged as wrong. The identity used
 * here is the whole point of the feature: a flag has to mean "this ingredient
 * is not this product", not "this exact ingredient line is not this product".
 */
describe("rankExternalRecipesByOffers with flagged pairings", () => {
  const softDrink = offer("COCA-COLA, FANTA, TUBORG SQUASH, SPRITE ELLER SCHWEPPES");

  function excluding(ingredientLabel: string, offerName: string) {
    return new Set([offerOverrideKey(ingredientLabel, offerName)]);
  }

  it("drops the offer but keeps the ingredient's row, at a score of 0", () => {
    // The ingredient didn't stop being part of the recipe just because this
    // week's offer for it turned out to be a soft drink — only the wrong
    // offer name should disappear, not the whole row.
    const ranked = rankExternalRecipesByOffers(
      [recipe("squash", ["1 stk squash"])],
      [softDrink],
      excluding("1 stk squash", softDrink.name),
    );
    expect(ranked[0]?.matchedIngredients).toEqual([
      { ingredient: "1 stk squash", offerNames: [], weekendOnlyOfferNames: [], price: undefined },
    ]);
    expect(ranked[0]?.matchedOfferNames).toEqual([]);
    expect(ranked[0]?.score).toBe(0);
  });

  it("applies a flag to the same ingredient however it is quantified", () => {
    // The bug this pins: flagging "1 stk squash" left every recipe saying
    // "2 stk squash" or "140 g squash" showing the same soft-drink offer, so
    // the flag looked like it had done nothing.
    const ranked = rankExternalRecipesByOffers(
      [recipe("two", ["2 stk squash"]), recipe("grams", ["140 g squash"])],
      [softDrink],
      excluding("1 stk squash", softDrink.name),
    );
    expect(ranked.every((r) => r.score === 0)).toBe(true);
  });

  it("ignores the offer name's capitalisation, which varies between imports", () => {
    const ranked = rankExternalRecipesByOffers(
      [recipe("squash", ["1 stk squash"])],
      [softDrink],
      excluding("1 stk squash", softDrink.name.toLowerCase()),
    );
    expect(ranked[0]?.score).toBe(0);
  });

  it("leaves a different ingredient and a different offer alone", () => {
    const broccoli = offer("Broccoli");
    const ranked = rankExternalRecipesByOffers(
      [recipe("mixed", ["1 stk squash", "1 stk broccoli"])],
      [softDrink, broccoli],
      excluding("1 stk squash", softDrink.name),
    );
    // Both rows stay — the squash row with no offers, the broccoli row
    // untouched — but only broccoli counts toward the score.
    expect(ranked[0]?.matchedIngredients.map((m) => m.ingredient)).toEqual([
      "1 stk squash",
      "1 stk broccoli",
    ]);
    expect(ranked[0]?.matchedIngredients.find((m) => m.ingredient === "1 stk squash")?.offerNames).toEqual(
      [],
    );
    expect(ranked[0]?.score).toBe(1);
  });
});
