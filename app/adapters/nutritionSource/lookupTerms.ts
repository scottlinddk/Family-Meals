import type { NutritionSource } from "~/adapters/nutritionSource/NutritionSource";
import type { IngredientTerm } from "~/domain/nutrition/ingredientTerms";
import type { NutritionFact } from "~/data/repositories/nutritionFactRepository";

/**
 * Looking up a batch of ingredient terms, which is the whole job the refresh
 * endpoint does.
 *
 * Three things make this more than a `Promise.all`:
 *
 *   * **A miss is a result.** FatSecret not knowing `frilandsgris` is an
 *     answer worth writing down (as `source: "unmatched"`), so the next
 *     refresh spends its budget on terms nobody has asked about yet.
 *   * **A failure is not.** One term throwing — a timeout, a 500 — must not
 *     lose the fifty that already succeeded, so failures are collected and
 *     reported rather than thrown, and those terms stay uncached and get
 *     retried next time. A *total* failure (the first call fails, the token
 *     is refused) still surfaces: nothing is written and every term is
 *     reported as failed.
 *   * **Concurrency has to be bounded.** Each term is two API calls against a
 *     rate-limited key, and firing 200 terms at once is the reliable way to
 *     get throttled.
 */

/** Terms looked up at a time. Enough to be quick, low enough to stay polite. */
const DEFAULT_CONCURRENCY = 4;

export interface LookupBatchResult {
  facts: NutritionFact[];
  /** Terms whose lookup threw, with the reason. They stay uncached. */
  failures: { term: string; message: string }[];
  matched: number;
  unmatched: number;
}

export async function lookupTerms(
  source: NutritionSource,
  terms: IngredientTerm[],
  { concurrency = DEFAULT_CONCURRENCY }: { concurrency?: number } = {},
): Promise<LookupBatchResult> {
  const facts: NutritionFact[] = [];
  const failures: LookupBatchResult["failures"] = [];
  let next = 0;

  async function worker() {
    for (let index = next++; index < terms.length; index = next++) {
      const term = terms[index]!;
      try {
        const found = await source.lookup(term.query);
        facts.push(
          found
            ? {
                term: term.key,
                query: term.query,
                source: "fatsecret",
                foodId: found.foodId,
                foodName: found.foodName,
                per100g: found.per100g,
              }
            : { term: term.key, query: term.query, source: "unmatched" },
        );
      } catch (error) {
        failures.push({
          term: term.key,
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(Math.max(1, concurrency), terms.length || 1) }, worker),
  );

  return {
    facts,
    failures,
    matched: facts.filter((fact) => fact.source === "fatsecret").length,
    unmatched: facts.filter((fact) => fact.source === "unmatched").length,
  };
}
