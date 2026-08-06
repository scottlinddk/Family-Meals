import { inArray } from "drizzle-orm";
import { db } from "~/data/db/client";
import { nutritionFacts as nutritionFactsTable } from "~/data/db/schema";
import type { Nutrients } from "~/domain/nutrition/nutrients";
import type { NutrientLookup } from "~/domain/nutrition/recipeNutrition";

/** One cached lookup: figures per 100 g, or a recorded miss. */
export interface NutritionFact {
  term: string;
  query: string;
  source: "fatsecret" | "unmatched";
  foodId?: string;
  foodName?: string;
  per100g?: Nutrients;
}

type Row = typeof nutritionFactsTable.$inferSelect;

function toDomain(row: Row): NutritionFact {
  const fact: NutritionFact = {
    term: row.term,
    query: row.query,
    source: row.source,
    foodId: row.foodId ?? undefined,
    foodName: row.foodName ?? undefined,
  };
  if (row.source === "fatsecret" && row.kcal !== null) {
    fact.per100g = {
      kcal: row.kcal,
      proteinG: row.proteinG ?? undefined,
      fatG: row.fatG ?? undefined,
      carbsG: row.carbsG ?? undefined,
      saturatedFatG: row.saturatedFatG ?? undefined,
      fiberG: row.fiberG ?? undefined,
      sugarG: row.sugarG ?? undefined,
      sodiumMg: row.sodiumMg ?? undefined,
    };
  }
  return fact;
}

/**
 * The FatSecret nutrition cache (`nutrition_facts`).
 *
 * Read on every request that shows or ranks nutrition and written only by the
 * refresh endpoint, so the read path never waits on a third-party API — the
 * same shape as the offer and recipe caches.
 */
export const nutritionFactRepository = {
  async listAll(): Promise<NutritionFact[]> {
    const rows = await db.select().from(nutritionFactsTable);
    return rows.map(toDomain);
  },

  /**
   * The cache as the lookup map the domain wants: matched terms only, so a
   * recorded miss reads as "no data for this line" rather than as zero
   * calories.
   */
  async loadLookup(): Promise<NutrientLookup> {
    const rows = await db.select().from(nutritionFactsTable);
    const lookup = new Map<string, Nutrients>();
    for (const row of rows) {
      const fact = toDomain(row);
      if (fact.per100g) lookup.set(fact.term, fact.per100g);
    }
    return lookup;
  },

  /** Which of `terms` are already cached — matched or recorded as a miss. */
  async listKnownTerms(terms: string[]): Promise<Set<string>> {
    if (terms.length === 0) return new Set();
    const rows = await db
      .select({ term: nutritionFactsTable.term })
      .from(nutritionFactsTable)
      .where(inArray(nutritionFactsTable.term, terms));
    return new Set(rows.map((row) => row.term));
  },

  /**
   * Inserts or refreshes cached facts, keyed by term.
   *
   * Replace rather than update-in-place: a re-lookup can turn a match into a
   * miss (or the other way round), and every column moves together when it
   * does, so there is no partial row where an old `foodName` outlives the
   * figures it belonged to.
   */
  async upsertMany(facts: NutritionFact[]): Promise<void> {
    if (facts.length === 0) return;
    await db.transaction(async (tx) => {
      await tx.delete(nutritionFactsTable).where(
        inArray(
          nutritionFactsTable.term,
          facts.map((fact) => fact.term),
        ),
      );
      await tx.insert(nutritionFactsTable).values(
        facts.map((fact) => ({
          term: fact.term,
          query: fact.query,
          source: fact.source,
          foodId: fact.foodId ?? null,
          foodName: fact.foodName ?? null,
          kcal: fact.per100g?.kcal ?? null,
          proteinG: fact.per100g?.proteinG ?? null,
          fatG: fact.per100g?.fatG ?? null,
          carbsG: fact.per100g?.carbsG ?? null,
          saturatedFatG: fact.per100g?.saturatedFatG ?? null,
          fiberG: fact.per100g?.fiberG ?? null,
          sugarG: fact.per100g?.sugarG ?? null,
          sodiumMg: fact.per100g?.sodiumMg ?? null,
          fetchedAt: new Date(),
        })),
      );
    });
  },
};
