import { describe, expect, it } from "vitest";
import { findRelatedExternalRecipes } from "~/domain/recipes/relatedExternalRecipes";
import type { BaseRecipe, ExternalRecipe } from "~/domain/types";

function baseRecipe(ingredientNames: string[]): BaseRecipe {
  return {
    id: "base",
    title: "Base recipe",
    proteinType: "chicken",
    tags: [],
    ingredients: ingredientNames.map((name) => ({ name, quantity: 1, unit: "stk" })),
    instructions: [],
    dinnerTimeLocal: "18:00",
  };
}

function externalRecipe(id: string, ingredients: string[]): ExternalRecipe {
  return { id, title: id, url: `https://x/opskrifter/${id}`, ingredients };
}

describe("findRelatedExternalRecipes", () => {
  it("ranks external recipes with more ingredient overlap first, excluding zero-overlap ones", () => {
    const recipe = baseRecipe(["Kyllingebryst", "Broccoli", "Ris"]);
    const externalRecipes = [
      externalRecipe("no-match", ["Pasta", "Fløde"]),
      externalRecipe("one-match", ["Kyllingebryst", "Løg"]),
      externalRecipe("two-match", ["Kyllingebryst", "Broccoli", "Gulerødder"]),
    ];

    const related = findRelatedExternalRecipes(recipe, externalRecipes);

    expect(related.map((r) => r.recipe.id)).toEqual(["two-match", "one-match"]);
    expect(related[0]?.score).toBe(2);
  });

  it("caps results at the given limit", () => {
    const recipe = baseRecipe(["Kyllingebryst"]);
    const externalRecipes = Array.from({ length: 8 }, (_, i) => externalRecipe(`match-${i}`, ["Kyllingebryst"]));

    const related = findRelatedExternalRecipes(recipe, externalRecipes, 3);

    expect(related).toHaveLength(3);
  });
});
