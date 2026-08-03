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
        })),
      );
    });
  },
};
