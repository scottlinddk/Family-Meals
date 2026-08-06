import { describe, expect, it } from "vitest";
import type { ExternalRecipe, Offer } from "~/domain/types";
import { rankRecipeSuggestions } from "~/domain/recipes/suggestionRanking";

function recipe(id: string, ingredients: string[], tags = ["aftensmad"]): ExternalRecipe {
  return {
    id,
    title: id,
    url: `https://madogdrikke.rema1000.dk/opskrifter/${id}`,
    ingredients,
    instructions: [],
    servings: 4,
    tags,
  };
}

function offer(name: string): Offer {
  return {
    name,
    unitSizeFrom: 1,
    unitSizeTo: 1,
    unitSymbol: "kg",
    price: 30,
    currencyCode: "DKK",
    unitPrice: 30,
    baseUnit: "kg",
    departmentSlug: "koed-fisk",
    validFrom: "2025-01-06T00:00:00Z",
    validUntil: "2025-01-12T23:59:59Z",
  };
}

/** A heavy discounted meat dish, a light meat-free one, and a heavy meat-free one. */
const cheapAndHeavy = recipe("flaeskesteg", [
  "1 kg svinekød",
  "5 dl piskefløde",
  "100 g smør",
  "500 g kartofler",
]);
// Meat-free means REMA's own `kodfri` tag, verified against the ingredients
// — see `vegetarian.ts` for why the tag leads and the scan only vetoes.
const lightVegetarian = recipe(
  "linsesuppe",
  ["300 g linser", "2 gulerødder", "1 løg", "1 l vand"],
  ["aftensmad", "kodfri"],
);
const heavyVegetarian = recipe(
  "ostetærte",
  ["400 g ost", "3 dl piskefløde", "200 g mel", "4 æg"],
  ["aftensmad", "kodfri"],
);

const offers = [offer("Dansk svinekød"), offer("Kartofler 2 kg")];
const all = [cheapAndHeavy, lightVegetarian, heavyVegetarian];

const titles = (ranked: { recipe: ExternalRecipe }[]) => ranked.map((entry) => entry.recipe.title);

describe("rankRecipeSuggestions", () => {
  it("sorts by offer overlap when that's what was asked for", () => {
    expect(titles(rankRecipeSuggestions(all, offers, { sort: "offers" }))[0]).toBe("flaeskesteg");
  });

  it("sorts by calories per serving when that's what was asked for", () => {
    // The lightest dish wins even though it has nothing on offer, which is
    // the whole point of the mode.
    expect(titles(rankRecipeSuggestions(all, offers, { sort: "calories" }))[0]).toBe("linsesuppe");
  });

  it("drops meat entirely under the vegetarian filter, rather than demoting it", () => {
    const vegetarian = rankRecipeSuggestions(all, offers, { vegetarianOnly: true });
    expect(titles(vegetarian).sort()).toEqual(["linsesuppe", "ostetærte"]);
  });

  it("lets all three signals speak in the balanced default", () => {
    const balanced = rankRecipeSuggestions(all, offers);
    // Light and meat-free beats discounted-but-heavy on two of three counts.
    expect(titles(balanced)[0]).toBe("linsesuppe");
    // …and heavy-and-meat-free still beats nothing: it keeps its own place.
    expect(titles(balanced)).toHaveLength(3);
  });

  it("reports the parts of the score, so a ranking can be checked", () => {
    const [top] = rankRecipeSuggestions([cheapAndHeavy], offers, { sort: "offers" });
    expect(top!.offerScore).toBeGreaterThan(0);
    expect(top!.components.vegetarian).toBe(0);
    expect(top!.calories?.perServingKcal).toBeGreaterThan(0);
    expect(top!.matchedIngredients.map((match) => match.ingredient)).toContain("1 kg svinekød");
  });

  it("is deterministic — the same offers and recipes give the same order", () => {
    const first = titles(rankRecipeSuggestions(all, offers));
    const second = titles(rankRecipeSuggestions([...all].reverse(), offers));
    expect(second).toEqual(first);
  });

  it("still ranks when nothing is on offer at all", () => {
    const ranked = rankRecipeSuggestions(all, []);
    expect(ranked).toHaveLength(3);
    expect(ranked.every((entry) => entry.components.offers === 0)).toBe(true);
    // With offers silent, the light meat-free dish leads on the other two.
    expect(titles(ranked)[0]).toBe("linsesuppe");
  });

  it("returns only as many suggestions as asked for", () => {
    expect(rankRecipeSuggestions(all, offers, { limit: 2 })).toHaveLength(2);
  });
});
