import type { AdultVariant, ChildVariant } from "~/domain/types";
import type { CatalogEntry } from "~/domain/recipes/recipeCatalog";

/**
 * Derives the adult (calorie-minimized) variant from a catalog entry.
 *
 * Hard rule: this only ever layers substitutions/portioning notes on top of
 * the shared BaseRecipe — it must never mutate `entry.recipe.ingredients`,
 * because that would shrink the base recipe and flow through to the child
 * variant too.
 */
export function deriveAdultVariant(entry: CatalogEntry): AdultVariant {
  return {
    baseRecipeId: entry.recipe.id,
    substitutions: entry.template.adultSubstitutions,
    portioningNotes: entry.template.adultPortioningNotes,
  };
}

/**
 * Derives the child (toddler) variant from a catalog entry.
 *
 * Hard rule: always adds a supplementary calorie-dense addition on top of
 * the unmodified base recipe, and never applies any of the adult variant's
 * calorie-cutting substitutions. This keeps the toddler's total calories
 * unaffected by, or higher than, the base recipe — independent of whatever
 * calorie-minimization was applied for the adults.
 */
export function deriveChildVariant(entry: CatalogEntry): ChildVariant {
  if (entry.template.childAdditions.length === 0) {
    throw new Error(
      `Recipe "${entry.recipe.id}" has no child calorie-dense addition defined; ` +
        "every recipe must supply at least one so the toddler's calories are never reduced.",
    );
  }

  return {
    baseRecipeId: entry.recipe.id,
    additions: entry.template.childAdditions,
    textureNotes: entry.template.childTextureNotes,
    saltSugarNotes: entry.template.childSaltSugarNotes,
  };
}
