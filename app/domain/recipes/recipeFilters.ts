import type { CatalogEntry } from "~/domain/recipes/recipeCatalog";

export interface RecipeFilters {
  q: string;
  proteins: string[];
  tags: string[];
}

export const EMPTY_RECIPE_FILTERS: RecipeFilters = { q: "", proteins: [], tags: [] };

function matchesQuery(entry: CatalogEntry, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  return (
    entry.recipe.title.toLowerCase().includes(needle) ||
    entry.recipe.ingredients.some((ingredient) => ingredient.name.toLowerCase().includes(needle))
  );
}

/**
 * Filters the curated recipe catalog by free-text search (title or
 * ingredient name), protein type, and tags — all filters are AND'd
 * together, and within a filter multiple values are OR'd (e.g. selecting
 * "chicken" and "fish" shows recipes matching either).
 */
export function filterRecipes(entries: CatalogEntry[], filters: RecipeFilters): CatalogEntry[] {
  return entries.filter((entry) => {
    if (!matchesQuery(entry, filters.q)) return false;
    if (filters.proteins.length > 0 && !filters.proteins.includes(entry.recipe.proteinType)) return false;
    if (filters.tags.length > 0 && !filters.tags.some((tag) => entry.recipe.tags.includes(tag))) return false;
    return true;
  });
}
