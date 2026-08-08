import { eq } from "drizzle-orm";
import { db } from "~/data/db/client";
import { externalRecipes as externalRecipesTable } from "~/data/db/schema";
import type { ExternalRecipe } from "~/domain/types";

function toDomain(row: typeof externalRecipesTable.$inferSelect): ExternalRecipe {
  return {
    id: row.id,
    title: row.title,
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
   * touching any other row — unlike `replaceAll`, which clears the whole
   * table first. Used by the URL-paste import (one user-chosen page at a
   * time), where wiping REMA's cached recipes on every import would be
   * wrong.
   */
  async upsert(recipe: ExternalRecipe): Promise<void> {
    await db
      .insert(externalRecipesTable)
      .values({
        id: recipe.id,
        title: recipe.title,
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

  /** Replaces the whole cached recipe set with a fresh scrape. */
  async replaceAll(recipes: ExternalRecipe[]): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.delete(externalRecipesTable);
      if (recipes.length === 0) return;
      await tx.insert(externalRecipesTable).values(
        recipes.map((r) => ({
          id: r.id,
          title: r.title,
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
