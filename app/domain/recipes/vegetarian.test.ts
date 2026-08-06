import { describe, expect, it } from "vitest";
import { assessVegetarian, meatTermIn } from "~/domain/recipes/vegetarian";

const recipe = (ingredients: string[], tags: string[] = []) => ({ ingredients, tags });

describe("meatTermIn", () => {
  it("finds the animal in the compounds REMA's recipes actually use", () => {
    for (const line of [
      "500 g hakket oksekød",
      "4 kyllingebryster",
      "200 g bacon i tern",
      "1 pakke medisterpølse",
      "300 g laksefilet",
      "150 g røget skinke",
      "2 dåser tunfisk i vand",
      "400 g svinemørbrad",
      "1 bakke rejer",
    ]) {
      expect(meatTermIn(line), line).toBeDefined();
    }
  });

  it("counts anything made from the animal, not only the cut", () => {
    // The opposite call to `ingredientOfferScore`'s, on purpose: buying the
    // stock cube doesn't get you the bird, but eating it isn't meat-free.
    expect(meatTermIn("1 terning kyllingebouillon")).toBeDefined();
    expect(meatTermIn("2 spsk fiskesauce")).toBeDefined();
    expect(meatTermIn("50 g leverpostej")).toBeDefined();
  });

  it("leaves vegetables, dairy and eggs alone", () => {
    for (const line of [
      "2 dl vand",
      "1 knivspids salt",
      "200 g champignon",
      "4 æg",
      "1 dl piskefløde",
      "100 g revet ost",
      "1 bøtte hummus",
      "2 spsk olivenolie",
      "1 bundt frisk persille",
      "300 g kartofler",
      "1 lampeskærm af sukkermasse",
      "200 g bøffelmozzarella",
      "150 g grissini",
    ]) {
      expect(meatTermIn(line), line).toBeUndefined();
    }
  });

  it("believes a line that says it is the meat-free version", () => {
    expect(meatTermIn("400 g vegetarpølser")).toBeUndefined();
    expect(meatTermIn("250 g plantefars")).toBeUndefined();
    expect(meatTermIn("1 pakke vegansk bacon")).toBeUndefined();
  });
});

describe("assessVegetarian", () => {
  it("takes REMA's own kodfri tag when the ingredients agree with it", () => {
    const result = assessVegetarian(
      recipe(["300 g linser", "2 gulerødder", "1 dl kokosmælk"], ["aftensmad", "kodfri"]),
    );
    expect(result).toEqual({ vegetarian: true, meatLines: [], basis: "tag" });
  });

  it("won't call an untagged recipe meat-free, however vegetable its ingredients look", () => {
    // Measured: the text scan alone called 115 of 350 recipes meat-free —
    // among them "Pasta, kødboller og tomatsovs". The tag is the publisher's
    // own classification and beats anything read out of free text.
    const result = assessVegetarian(recipe(["300 g linser", "2 gulerødder"]));
    expect(result).toEqual({ vegetarian: false, meatLines: [], basis: "untagged" });
  });

  it("lets an ingredient veto the tag, and names the line that did it", () => {
    // A real one: "Aspargessuppe" is tagged kodfri and lists bacon.
    const result = assessVegetarian(
      recipe(["1 bundt asparges", "1 pakke bacon i tern"], ["aftensmad", "kodfri"]),
    );
    expect(result.vegetarian).toBe(false);
    expect(result.basis).toBe("meat-found");
    expect(result.meatLines).toEqual([{ line: "1 pakke bacon i tern", term: "bacon" }]);
  });

  it("vetoes on stock as much as on the cut", () => {
    const result = assessVegetarian(
      recipe(["900 ml kyllinge/hønse bouillon", "2 stængler selleri"], ["kodfri"]),
    );
    expect(result.vegetarian).toBe(false);
  });

  it("keeps the meat-free versions of meat products", () => {
    const result = assessVegetarian(
      recipe(["1 pose kødfri fars", "1 pakke Vegetariske pølser"], ["kodfri"]),
    );
    expect(result).toEqual({ vegetarian: true, meatLines: [], basis: "tag" });
  });
});
