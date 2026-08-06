import { describe, expect, it } from "vitest";
import { ENGLISH_NAMES, ingredientTerm, ingredientTerms } from "~/domain/nutrition/ingredientTerms";
import { KCAL_PER_100G } from "~/domain/recipes/calorieEstimate";

describe("ingredientTerm", () => {
  it("asks in Danish first, and keeps English in reserve", () => {
    const term = ingredientTerm("500 g hakket oksekød")!;
    expect(term.key).toBe("oksekød");
    expect(term.query).toBe("oksekød");
    expect(term.fallbackQuery).toBe("ground beef");
    expect(term.recognised).toBe(true);
  });

  it("resolves a compound to the product it is a kind of", () => {
    expect(ingredientTerm("2 stk kyllingebryst")!.query).toBe("kyllingebryst");
    expect(ingredientTerm("2 stk kyllingebryst")!.fallbackQuery).toBe("chicken breast");
    expect(ingredientTerm("1 rødløg")!.query).toBe("rødløg");
  });

  it("doesn't send fresh herbs to look up rice", () => {
    // The vocabulary's own trap: "friske" contains the letters of "ris".
    const term = ingredientTerm("1 bundt friske krydderurter")!;
    expect(term.query).toBe("krydderurter");
    expect(term.fallbackQuery).toBe("fresh herbs");
  });

  it("falls back to a stable phrase for a product the vocabulary doesn't know", () => {
    const term = ingredientTerm("1 pakke frisk frilandsgris i skiver")!;
    expect(term.recognised).toBe(false);
    // The unit and the preparation words are dropped; what names the product
    // is kept, so the miss caches under the same key next week.
    expect(term.key).toBe("frilandsgris skiver");
    expect(term.query).toBe(term.key);
    // Nothing to translate an unknown Danish word into, so there's no retry.
    expect(term.fallbackQuery).toBeUndefined();
  });

  it("is null when a line names nothing to look up", () => {
    expect(ingredientTerm("")).toBeNull();
    expect(ingredientTerm("2 stk")).toBeNull();
  });
});

describe("ingredientTerms", () => {
  it("dedupes, because 350 recipes listing onion is still one lookup", () => {
    const terms = ingredientTerms(["2 løg", "1 rødløg", "1 løg, hakket", "500 g kartofler"]);
    expect(terms.map((term) => term.key)).toEqual(["løg", "rødløg", "kartofler"]);
  });
});

describe("the product vocabulary", () => {
  /*
   * The two tables are written together and have to stay that way: a kcal key
   * with no English name would silently be searched for in Danish against an
   * English database, which returns nothing and caches the miss.
   */
  it("has an English name for every product the kcal table knows", () => {
    const missing = Object.keys(KCAL_PER_100G).filter((key) => !(key in ENGLISH_NAMES));
    expect(missing).toEqual([]);
  });
});
