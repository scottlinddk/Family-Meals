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
    curated: true,
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
    curated: true,
  };
}

const GENERIC_ADULT_NOTE =
  "No calorie-adjustment guidance is available for this recipe — check ingredient quantities on the original recipe page and adjust portions manually.";
const GENERIC_CHILD_TEXTURE_NOTE =
  "No child-specific texture guidance is available for this recipe — adapt consistency for a toddler manually.";
const GENERIC_CHILD_ADDITION_NOTE =
  "No curated calorie-dense addition is available for this recipe, so the toddler's calories aren't guaranteed to meet their needs — consider adding a side (e.g. bread with butter, avocado, or cheese) manually.";

/**
 * Fallback adult variant for recipes with no hand-authored template (e.g.
 * REMA 1000's own recipes, which aren't curated with substitutions/notes) —
 * surfaces a generic disclaimer instead of dish-specific guidance.
 */
export function deriveUncuratedAdultVariant(baseRecipeId: string): AdultVariant {
  return {
    baseRecipeId,
    substitutions: [],
    portioningNotes: [GENERIC_ADULT_NOTE],
    curated: false,
  };
}

/**
 * Fallback child variant for recipes with no hand-authored template. Unlike
 * `deriveChildVariant`, this does not guarantee a calorie-dense addition —
 * that guarantee only holds for the curated catalog — so the missing
 * guarantee is surfaced explicitly via `curated: false` and a disclaimer
 * rather than silently omitted.
 */
export function deriveUncuratedChildVariant(baseRecipeId: string): ChildVariant {
  return {
    baseRecipeId,
    additions: [],
    textureNotes: [GENERIC_CHILD_TEXTURE_NOTE],
    saltSugarNotes: [GENERIC_CHILD_ADDITION_NOTE],
    curated: false,
  };
}
