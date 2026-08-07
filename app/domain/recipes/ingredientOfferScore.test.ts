import { describe, expect, it } from "vitest";
import { offersMatchingIngredient, productTokens } from "~/domain/recipes/ingredientOfferScore";
import type { Offer } from "~/domain/types";

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

  it("does not match water to watermelon, nor garlic to a garlic marinade", () => {
    expect(matchedNames("120 ml vand", [offer("Vandmelon")])).toEqual([]);
    expect(
      matchedNames("6 fed hvidløg", [offer("Food and Glory hel kylling med hvidløgsmarinade")]),
    ).toEqual([]);
  });

  it("does not match black beans to coffee beans sold loose", () => {
    expect(matchedNames("252 g sorte bønner", [offer("LAVAZZA HELE BØNNER")])).toEqual([]);
    expect(
      matchedNames("252 g sorte bønner", [
        offer("MERRILD GOLD INSTANT KAFFE ELLER HELE BØNNER"),
      ]),
    ).toEqual([]);
    // Neither side naming a colour is still a match.
    expect(matchedNames("1 dåse bønner", [offer("Hele bønner")])).toEqual(["Hele bønner"]);
    // Matching colours on both sides still match.
    expect(matchedNames("252 g sorte bønner", [offer("Sorte bønner")])).toEqual(["Sorte bønner"]);
  });

  it("does not match a colour-qualified ingredient to a differently coloured offer", () => {
    expect(matchedNames("1 dåse hvide bønner", [offer("Grønne bønner")])).toEqual([]);
    // The mismatch runs the other way too: "grønne citroner" are limes.
    expect(
      matchedNames("0.5 stk økologisk citron", [offer("AARSTIDERNE ØKOLOGISKE GRØNNE CITRONER")]),
    ).toEqual([]);
  });
});

/**
 * The second class the same offer set produced: an offer that names a
 * *processed form* of the ingredient. These reach the matcher with the
 * ingredient's own word intact — "chili saucer" really does say chili — so
 * the compound rules above have nothing to object to and the offer has to be
 * judged as a whole phrase instead.
 */
describe("offersMatchingIngredient on offers naming a processed form", () => {
  it("does not match a raw ingredient to a condiment made from it", () => {
    expect(matchedNames("1 stk chili", [offer("Go-Tan chili saucer")])).toEqual([]);
    expect(matchedNames("1 stk chili", [offer("Sempio Gochujang Chili Paste")])).toEqual([]);
    expect(
      matchedNames("1 dåse hakkede tomater", [offer("Beauvais tomat ketchup eller puré")]),
    ).toEqual([]);
    expect(matchedNames("2 stk rødløg", [offer("Zelected syltede rødløg, pink perleløg")])).toEqual(
      [],
    );
    expect(matchedNames("100 g salat", [offer("Jensens eller K-Salat sauce")])).toEqual([]);
  });

  it("still matches an ingredient that asks for the condiment itself", () => {
    const ketchup = offer("Beauvais tomat ketchup eller puré");
    expect(matchedNames("2 spsk ketchup", [ketchup])).toEqual([ketchup.name]);
    // The mustard in this bundle is genuinely on offer, and the ketchup and
    // mayo alternatives beside it must not disqualify the whole thing.
    const mustard = offer("Graasten remoulade, ketchup eller sennep, Hellman's mayo eller Maille sennep");
    expect(matchedNames("1 spsk dijon sennep", [mustard])).toEqual([mustard.name]);
  });

  it("reads an offer's 'med' clause as flavour rather than as a second product", () => {
    expect(
      matchedNames("6 fed hvidløg", [offer("Food and Glory hel kylling med hvidløgsmarinade")]),
    ).toEqual([]);
    expect(
      matchedNames("1 pakke bacon", [
        offer("REMA 1000 Hakkebøffer med bøgerøget bacon og grønt eller kalve grillsticks med grønt"),
      ]),
    ).toEqual([]);
  });

  it("keeps the sibling products listed after a 'med' clause", () => {
    // REMA also writes "med" ahead of a list of real alternatives, so cutting
    // the whole name at its first "med" threw three products away.
    const mince = offer(
      "REMA 1000 Hakket dansk oksekød med 35% grønt, kyllingekød, grise- og kalvekød eller Frilandsgris skinkekød",
    );
    expect(matchedNames("1 stk hel kylling", [mince])).toEqual([mince.name]);
    expect(matchedNames("1 pakke kogt skinke i skiver", [mince])).toEqual([mince.name]);

    const patties = offer(
      "REMA 1000 Hakkebøffer med bøgerøget bacon og grønt eller kalve grillsticks med grønt",
    );
    expect(matchedNames("1 kg kalvetykkam, afpudset", [patties])).toEqual([patties.name]);
  });

  it("treats a word as a processed form only where it is one", () => {
    // "brød" renames the product as a compound tail — a smørrebrød is not
    // butter — but as a word of its own it is the bread a recipe asks for.
    expect(matchedNames("100 g smør", [offer("Frisklavet luksus smørrebrød")])).toEqual([]);
    expect(matchedNames("4 stk brød", [offer("Schulstad Det Gode brød")])).toEqual([
      "Schulstad Det Gode brød",
    ]);
    expect(matchedNames("1 pakke brødcroutoner", [offer("Schulstad brød")])).toEqual([
      "Schulstad brød",
    ]);
  });

  it("does not match pumpkin to a Greek-yoghurt offer", () => {
    // "græsk" is provenance, and also a prefix of "græskar" (pumpkin), so
    // pumpkin seeds and a whole pumpkin both reached a yoghurt offer.
    const yoghurt = offer("Athena græsk yoghurt");
    expect(matchedNames("100 g græskarkerner", [yoghurt])).toEqual([]);
    expect(matchedNames("1 stk græskar", [yoghurt])).toEqual([]);
    // Dropping it from both sides still leaves them meeting on "yoghurt".
    expect(matchedNames("3 dl græsk yoghurt", [yoghurt])).toEqual([yoghurt.name]);
  });

  it("does not match through a compound tail that renames the product", () => {
    expect(
      matchedNames("120 ml vand", [offer("Vandskål, aktivitetslegetøj eller fleecetæppe 150x100 cm")]),
    ).toEqual([]);
    expect(matchedNames("250 ml creme fraiche", [offer("CREMEFINE")])).toEqual([]);
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
