import { describe, expect, it } from "vitest";
import { offersMatchingIngredient, productTokens } from "~/domain/recipes/ingredientOfferScore";
import type { Offer } from "~/domain/types";

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
    departmentSlug: "groceries_discount",
    validFrom: "2026-08-01T00:00:00Z",
    validUntil: "2026-08-08T00:00:00Z",
  };
}

/** Verbatim offer names from the production offers table. */
const REAL_OFFERS = [
  offer("Friland Hakket dansk oksekød 8-12%"),
  offer("REMA 1000 Dansk kyllingebrystfilet, -inderfilet eller hel kylling"),
  offer("REMA 1000 Fuldkornspasta"),
  offer("Grønne bønner"),
  offer("Snackgulerødder"),
  offer("Økologiske æg M/L"),
  offer("Spidskål"),
  offer("REMA 1000 Laksefileter, rødspættefileter eller hele rødspætter"),
].map((o) => o);

function matchedNames(ingredient: string, offers = REAL_OFFERS): string[] {
  return offersMatchingIngredient(ingredient, offers).map((o) => o.name);
}

describe("productTokens", () => {
  // Output is stemmed, so tokens are not always whole words ("olivenolie" ->
  // "olivenoli"). That is fine because both sides of a comparison are stemmed
  // the same way; these assertions pin the quantity/unit/prep stripping.
  it("strips quantities, units and preparation notes", () => {
    expect(productTokens("500 g hakket oksekød")).toEqual(["oksekød"]);
    expect(productTokens("2 spsk olivenolie")).toEqual(["olivenoli"]);
    expect(productTokens("1 løg (finthakket)")).toEqual(["løg"]);
  });

  it("stems both sides of a comparison identically", () => {
    expect(productTokens("2 spsk olivenolie")).toEqual(productTokens("Olivenolie"));
  });

  it("strips brand and provenance filler from offer names", () => {
    expect(productTokens("Friland Hakket dansk oksekød 8-12%")).toEqual(["friland", "oksekød"]);
  });
});

describe("offersMatchingIngredient", () => {
  it("matches an ingredient line to a bracketed, branded offer name", () => {
    // The case the old bidirectional-substring check scored 0 on: neither
    // string contains the other.
    expect(matchedNames("500 g hakket oksekød")).toEqual(["Friland Hakket dansk oksekød 8-12%"]);
  });

  it("matches a compound ingredient to the offer's product family", () => {
    // "kyllingebryst" is a prefix of the offer's "kyllingebrystfilet".
    expect(matchedNames("400 g kyllingebryst")).toEqual([
      "REMA 1000 Dansk kyllingebrystfilet, -inderfilet eller hel kylling",
    ]);
  });

  it("matches an alternative listed after 'eller' in a bundled offer", () => {
    expect(matchedNames("2 laksefileter")).toEqual([
      "REMA 1000 Laksefileter, rødspættefileter eller hele rødspætter",
    ]);
  });

  it("matches across singular/plural", () => {
    expect(matchedNames("200 g grønne bønner")).toEqual(["Grønne bønner"]);
    expect(matchedNames("4 æg")).toEqual(["Økologiske æg M/L"]);
  });

  it("does not match a different product that merely ends in the same word", () => {
    // "hvidløg" (garlic) must not match an offer for "løg" (onion).
    expect(matchedNames("2 fed hvidløg", [offer("Løg")])).toEqual([]);
  });

  it("returns no match for an ingredient nothing is on offer for", () => {
    expect(matchedNames("1 dl fløde")).toEqual([]);
    expect(matchedNames("salt og peber")).toEqual([]);
  });
});
