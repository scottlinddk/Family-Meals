import { RECIPE_CATALOG, getRecipeById, type CatalogEntry } from "~/domain/recipes/recipeCatalog";

/**
 * Recipe content is currently authored, static, hand-curated data (see the
 * project plan's "recipe bank must be authored/curated" assumption) rather
 * than a user-editable database table — there's no UI for adding recipes
 * yet, so a real `recipes` table would be unused complexity. This thin
 * passthrough keeps the repository interface stable so callers don't care
 * whether recipes live in code or a DB; if recipe curation moves into the
 * product later, only this file's internals need to change.
 */
export const recipeRepository = {
  async listAll(): Promise<CatalogEntry[]> {
    return RECIPE_CATALOG;
  },

  async getById(id: string): Promise<CatalogEntry | undefined> {
    return getRecipeById(id);
  },
};
