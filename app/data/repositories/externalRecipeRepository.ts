import { eq } from "drizzle-orm";
import { db } from "~/data/db/client";
import { externalRecipes as externalRecipesTable } from "~/data/db/schema";
import type { ExternalRecipe } from "~/domain/types";

function toDomain(row: typeof externalRecipesTable.$inferSelect): ExternalRecipe {
  return {
    id: row.id,
    title: row.title,
    source: row.source,
    url: row.url,
    imageUrl: row.imageUrl ?? undefined,
    description: row.description ?? undefined,
    ingredients: row.ingredients as string[],
    instructions: row.instructions as string[],
    servings: row.servings ?? undefined,
    totalTimeMinutes: row.totalTimeMinutes ?? undefined,
    tags: (row.tags as string[] | null) ?? [],
  };
}

/** Cache for REMA 1000's own recipes (`RemaRecipeSource`), refreshed via the /opskrifter refresh action. */
export const externalRecipeRepository = {
  async listAll(): Promise<ExternalRecipe[]> {
    const rows = await db.select().from(externalRecipesTable);
    return rows.map(toDomain);
  },

  async getById(id: string): Promise<ExternalRecipe | undefined> {
    const [row] = await db.select().from(externalRecipesTable).where(eq(externalRecipesTable.id, id));
    return row ? toDomain(row) : undefined;
  },

  /**
   * Inserts or updates a single recipe, keyed by its own `id`, without
   * touching any other row — unlike `replaceForSource`, which clears a whole
   * source's rows first. Used by the URL-paste import (one user-chosen page
   * at a time), where clearing anything beyond that one row would be wrong.
   */
  async upsert(recipe: ExternalRecipe): Promise<void> {
    await db
      .insert(externalRecipesTable)
      .values({
        id: recipe.id,
        title: recipe.title,
        source: recipe.source,
        url: recipe.url,
        imageUrl: recipe.imageUrl,
        description: recipe.description,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        servings: recipe.servings,
        totalTimeMinutes: recipe.totalTimeMinutes,
        tags: recipe.tags ?? [],
      })
      .onConflictDoUpdate({
        target: externalRecipesTable.id,
        set: {
          title: recipe.title,
          source: recipe.source,
          url: recipe.url,
          imageUrl: recipe.imageUrl,
          description: recipe.description,
          ingredients: recipe.ingredients,
          instructions: recipe.instructions,
          servings: recipe.servings,
          totalTimeMinutes: recipe.totalTimeMinutes,
          tags: recipe.tags ?? [],
          fetchedAt: new Date(),
        },
      });
  },

  /**
   * Replaces one source's recipes with a fresh scrape, leaving every other
   * source's rows untouched — unlike the old `replaceAll`, which cleared the
   * whole table and would silently delete, say, every URL-imported recipe on
   * the next REMA refresh.
   */
  async replaceForSource(source: string, recipes: ExternalRecipe[]): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.delete(externalRecipesTable).where(eq(externalRecipesTable.source, source));
      if (recipes.length === 0) return;
      await tx.insert(externalRecipesTable).values(
        recipes.map((r) => ({
          id: r.id,
          title: r.title,
          source: r.source,
          url: r.url,
          imageUrl: r.imageUrl,
          description: r.description,
          ingredients: r.ingredients,
          instructions: r.instructions,
          servings: r.servings,
          totalTimeMinutes: r.totalTimeMinutes,
          tags: r.tags ?? [],
        })),
      );
    });
  },
};
