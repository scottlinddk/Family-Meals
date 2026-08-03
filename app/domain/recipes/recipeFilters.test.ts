import { describe, expect, it } from "vitest";
import { filterRecipes } from "~/domain/recipes/recipeFilters";
import { RECIPE_CATALOG } from "~/domain/recipes/recipeCatalog";

describe("filterRecipes", () => {
  it("returns everything when no filters are set", () => {
    expect(filterRecipes(RECIPE_CATALOG, { q: "", proteins: [], tags: [] })).toHaveLength(RECIPE_CATALOG.length);
  });

  it("filters by free-text ingredient search, case-insensitively", () => {
    const results = filterRecipes(RECIPE_CATALOG, { q: "laksefilet", proteins: [], tags: [] });
    expect(results.map((r) => r.recipe.id)).toEqual(["salmon-veg"]);
  });

  it("filters by protein type", () => {
    const results = filterRecipes(RECIPE_CATALOG, { q: "", proteins: ["fish"], tags: [] });
    expect(results.every((r) => r.recipe.proteinType === "fish")).toBe(true);
    expect(results.length).toBeGreaterThan(0);
  });

  it("ORs multiple selected protein types", () => {
    const results = filterRecipes(RECIPE_CATALOG, { q: "", proteins: ["fish", "vegetarian"], tags: [] });
    expect(results.every((r) => r.recipe.proteinType === "fish" || r.recipe.proteinType === "vegetarian")).toBe(true);
  });

  it("filters by tag", () => {
    const results = filterRecipes(RECIPE_CATALOG, { q: "", proteins: [], tags: ["one-pot"] });
    expect(results.every((r) => r.recipe.tags.includes("one-pot"))).toBe(true);
    expect(results.length).toBeGreaterThan(0);
  });

  it("ANDs across filter kinds", () => {
    const results = filterRecipes(RECIPE_CATALOG, { q: "", proteins: ["beef"], tags: ["soup"] });
    expect(results.map((r) => r.recipe.id)).toEqual(["beef-veg-soup"]);
  });
});
