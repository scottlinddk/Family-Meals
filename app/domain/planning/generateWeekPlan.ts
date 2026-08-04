import type { DayPlan, ExternalRecipe, Offer, WeekPlan } from "~/domain/types";
import { deriveUncuratedAdultVariant, deriveUncuratedChildVariant } from "~/domain/recipes/variantDerivation";
import { rankExternalRecipesByOffers } from "~/domain/recipes/externalRecipeMatch";
import { toRecipeSnapshot } from "~/domain/recipes/recipeSnapshot";
import { addDays } from "~/lib/time";

export const GENERATOR_VERSION = "2.1.0";

/**
 * How many of the best-ranked remaining recipes a day is drawn from.
 *
 * Taking the single best every time made the plan a pure function of the
 * offers: "Regenerate whole week" returned the identical seven dinners and
 * read as a broken button. Drawing from a small top pool keeps the pick
 * offer-aware — everything in the pool is among the best available — while
 * letting a regenerate actually produce a different week.
 */
const CANDIDATE_POOL_SIZE = 5;

function pickFrom(candidates: ExternalRecipe[], random: () => number): ExternalRecipe | undefined {
  if (candidates.length === 0) return undefined;
  const pool = candidates.slice(0, CANDIDATE_POOL_SIZE);
  return pool[Math.floor(random() * pool.length) % pool.length];
}

/**
 * Picks a recipe for one slot, preferring — in order — one that is neither
 * planned elsewhere this week nor cooked in the recent past, then one merely
 * unused this week, then anything but yesterday's. Each step draws from a
 * top-ranked pool rather than taking the single best (see
 * `CANDIDATE_POOL_SIZE`); the last step is a small-pool safety net.
 */
function pickRecipeForDay(
  rankedRecipes: ExternalRecipe[],
  usedRecipeIds: Set<string>,
  recentRecipeIds: Set<string>,
  previousDayRecipeId: string | null,
  random: () => number,
): ExternalRecipe {
  const unused = rankedRecipes.filter((recipe) => !usedRecipeIds.has(recipe.id));

  return (
    pickFrom(
      unused.filter((recipe) => !recentRecipeIds.has(recipe.id)),
      random,
    ) ??
    pickFrom(unused, random) ??
    rankedRecipes.find((recipe) => recipe.id !== previousDayRecipeId) ??
    rankedRecipes[0]!
  );
}

function buildDayPlan(
  recipe: ExternalRecipe,
  date: string,
  now: string,
  offers: Offer[],
  sequence: number,
): DayPlan {
  return {
    date,
    mealSlot: "dinner",
    baseRecipeId: recipe.id,
    recipeSnapshot: toRecipeSnapshot(recipe, offers),
    adultVariant: deriveUncuratedAdultVariant(recipe.id),
    childVariant: deriveUncuratedChildVariant(recipe.id),
    isManualOverride: false,
    editedAt: now,
    sequence,
  };
}

/**
 * Recipes that can actually be cooked from the app. A scrape that yielded no
 * ingredient list leaves a day with nothing to shop for and nothing to
 * follow, so those are held back — unless they're all we have, in which case
 * a thin plan still beats no plan.
 */
function cookableRecipes(recipes: ExternalRecipe[]): ExternalRecipe[] {
  const cookable = recipes.filter((recipe) => recipe.ingredients.length > 0);
  return cookable.length > 0 ? cookable : recipes;
}

export interface GenerateWeekPlanInput {
  familyId: string;
  weekStartDate: string; // Monday, ISO date
  offers: Offer[];
  /** Id of the offer import being ranked against, or null when the family has none. */
  offerSnapshotId: string | null;
  /** REMA 1000's own recipes (from `externalRecipeRepository`), the source for generated days. */
  externalRecipes: ExternalRecipe[];
  /**
   * Recipes cooked in recently-planned weeks, avoided where possible so the
   * family doesn't get the same rotation every week the offers hold steady.
   */
  recentRecipeIds?: string[];
  /**
   * The plan being replaced, if any. Its per-day `sequence` values are
   * carried forward and bumped: the ICS UID for a date is stable across
   * regeneration, and a subscribing calendar may ignore an update whose
   * SEQUENCE went backwards.
   */
  previousWeek?: WeekPlan;
  /** Injectable for deterministic tests. */
  random?: () => number;
}

export function generateWeekPlan({
  familyId,
  weekStartDate,
  offers,
  offerSnapshotId,
  externalRecipes,
  recentRecipeIds = [],
  previousWeek,
  random = Math.random,
}: GenerateWeekPlanInput): WeekPlan {
  if (externalRecipes.length === 0) {
    throw new Error(
      "No REMA 1000 recipes available to generate a week plan — refresh recipes from the offers page first.",
    );
  }

  const rankedRecipes = rankExternalRecipesByOffers(cookableRecipes(externalRecipes), offers).map(
    (ranked) => ranked.recipe,
  );
  const now = new Date().toISOString();

  const previousSequenceByDate = new Map(previousWeek?.days.map((day) => [day.date, day.sequence]) ?? []);
  const recent = new Set(recentRecipeIds);
  const usedRecipeIds = new Set<string>();
  let previousDayRecipeId: string | null = null;
  const days: DayPlan[] = [];

  for (let i = 0; i < 7; i++) {
    const date = addDays(weekStartDate, i);
    const recipe = pickRecipeForDay(rankedRecipes, usedRecipeIds, recent, previousDayRecipeId, random);
    const sequence = (previousSequenceByDate.get(date) ?? -1) + 1;
    days.push(buildDayPlan(recipe, date, now, offers, sequence));
    usedRecipeIds.add(recipe.id);
    previousDayRecipeId = recipe.id;
  }

  return {
    familyId,
    weekStartDate,
    days,
    generatedFrom: { offerSnapshotId, generatorVersion: GENERATOR_VERSION },
    createdAt: previousWeek?.createdAt ?? now,
    updatedAt: now,
  };
}
