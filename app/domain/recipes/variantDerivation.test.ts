import { describe, expect, it } from "vitest";
import { RECIPE_CATALOG } from "~/domain/recipes/recipeCatalog";
import { deriveAdultVariant, deriveChildVariant } from "~/domain/recipes/variantDerivation";

describe("variantDerivation", () => {
  it("never mutates the shared base recipe's ingredients when deriving the adult variant", () => {
    for (const entry of RECIPE_CATALOG) {
      const before = JSON.stringify(entry.recipe.ingredients);
      deriveAdultVariant(entry);
      expect(JSON.stringify(entry.recipe.ingredients)).toBe(before);
    }
  });

  it("always gives the child variant at least one calorie-dense addition", () => {
    for (const entry of RECIPE_CATALOG) {
      const child = deriveChildVariant(entry);
      expect(child.additions.length).toBeGreaterThan(0);
    }
  });

  it("never applies the adult variant's substitutions to the child variant", () => {
    for (const entry of RECIPE_CATALOG) {
      const adult = deriveAdultVariant(entry);
      const child = deriveChildVariant(entry);

      const childIngredientNames = child.additions.map((a) => a.name);
      for (const sub of adult.substitutions) {
        expect(childIngredientNames).not.toContain(sub.substituteIngredient);
      }
    }
  });
});
