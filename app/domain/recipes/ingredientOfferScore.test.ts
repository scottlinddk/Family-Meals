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

/**
 * Cases measured against a real offer set (91 REMA offers, week of 2026-08-04)
 * and the 350 scraped dinner recipes. Each one was a wrong match that inflated
 * the "best meals from this week's offers" ranking.
 */
describe("offersMatchingIngredient against real-world false matches", () => {
  it("does not match garlic to a white-wine offer", () => {
    // "Santa Carolina Vistana Chilensk rød-, hvid- eller rosévin" splits into
    // an alternative that is just the adjective "hvid" — which used to prefix-
    // match "hvidløg" in 184 ingredient lines.
    expect(
      matchedNames("1 fed hvidløg", [offer("Santa Carolina Vistana Chilensk rød-, hvid- eller rosévin, 75 cl")]),
    ).toEqual([]);
  });

  it("does not match a bottle of beer to a jar-and-bottle offer", () => {
    expect(matchedNames("1 flaske øl", [offer("Flaske, sylteglas, patentglas eller målekande")])).toEqual([]);
  });

  it("does not match greens to the '35% grønt' in a mince offer", () => {
    const mince = offer("REMA 1000 Hakket dansk oksekød med 35% grønt, kyllingekød eller Frilandsgris skinkekød");
    expect(matchedNames("1 terning grøntsagsbouillon", [mince])).toEqual([]);
    expect(matchedNames("100 g blandet grøn salat", [mince])).toEqual([]);
  });

  it("does not match caraway to pointed cabbage, nor pickled vegetables to a pickling book", () => {
    expect(matchedNames("1 tsk spidskommen", [offer("Spidskål")])).toEqual([]);
    expect(matchedNames("syltede rødbeder", [offer("Frøken Jensens syltebog")])).toEqual([]);
  });

  it("does not match a raw ingredient to a processed version of it", () => {
    // Buying the offer would not get you the ingredient.
    expect(matchedNames("50 g smør", [offer("BUKO smøreost eller friskost")])).toEqual([]);
    expect(matchedNames("3 dl kyllingebouillon", [offer("REMA 1000 Dansk kylling")])).toEqual([]);
    expect(matchedNames("150 g bacon i tern", [offer("Pålækker pålæg, baconpostej eller salami-hapser")])).toEqual([]);
    expect(matchedNames("3 cm ingefær", [offer("Frankly Ingefærshot")])).toEqual([]);
    expect(matchedNames("2 spsk fiskesauce", [offer("REMA 1000 Panerede fisk eller grønlandske rejer")])).toEqual([]);
  });

  it("still matches the product family through a compound", () => {
    const chicken = offer("REMA 1000 Dansk kyllingebrystfilet, -inderfilet eller hel kylling");
    expect(matchedNames("4 stk kyllingebryst", [chicken])).toEqual([chicken.name]);
    expect(matchedNames("1 pakke kyllinge inderfilet", [chicken])).toEqual([chicken.name]);
    // "grise- og kalvekød" is one of the mince offer's alternatives.
    const mince = offer("REMA 1000 Hakket dansk oksekød med 35% grønt, kyllingekød, grise- og kalvekød");
    expect(matchedNames("500 g grisekød", [mince])).toEqual([mince.name]);
    expect(matchedNames("1 pose salatmix", [offer("REMA 1000 Ready To Serve salat")])).toEqual([
      "REMA 1000 Ready To Serve salat",
    ]);
  });

  it("still matches potatoes, which is what the dropped shared-lead rule was for", () => {
    expect(matchedNames("650 g kartofler", [offer("Gram Slot Pommes frites eller kartofler")])).toEqual([
      "Gram Slot Pommes frites eller kartofler",
    ]);
  });
});

describe("offersMatchingIngredient on words that collide across departments", () => {
  it("does not match balsamico to a hair-conditioner offer", () => {
    expect(matchedNames("1 spsk balsamico", [offer("Elvital shampoo eller balsam")])).toEqual([]);
  });

  it("does not match prawns in brine to a vinegar offer, but still matches the vinegar itself", () => {
    const vinegar = offer("Heidelberg Lagereddike Farvet eller klar");
    expect(matchedNames("350 g rejer i lage", [vinegar])).toEqual([]);
    expect(matchedNames("1 dl lagereddike", [vinegar])).toEqual([vinegar.name]);
  });
});
