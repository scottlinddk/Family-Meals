import type { DayPlan, Offer, WeekPlan } from "~/domain/types";
import { RECIPE_CATALOG, type CatalogEntry } from "~/domain/recipes/recipeCatalog";
import { deriveAdultVariant, deriveChildVariant } from "~/domain/recipes/variantDerivation";
import {
  createInitialVarietyState,
  isAllowedByVariety,
  recordPlacement,
  type WeekVarietyState,
} from "~/domain/recipes/varietyConstraints";
import { rankEntriesByOffers } from "~/domain/planning/offerAwareSelection";
import { addDays } from "~/lib/time";

export const GENERATOR_VERSION = "1.0.0";

/**
 * Picks the best available entry for a single slot: highest offer-score
 * entry that satisfies the variety constraints. Falls back to the
 * highest-scoring entry that isn't literally the same recipe as yesterday
 * if every entry has hit the weekly repeat cap (small catalog safety net).
 */
function pickEntryForDay(
  rankedEntries: CatalogEntry[],
  state: WeekVarietyState,
): CatalogEntry {
  const allowed = rankedEntries.find((entry) => isAllowedByVariety(entry, state));
  if (allowed) return allowed;

  const notSameAsYesterday = rankedEntries.find(
    (entry) => entry.recipe.id !== state.previousDayRecipeId,
  );
  return notSameAsYesterday ?? rankedEntries[0]!;
}

function buildDayPlan(entry: CatalogEntry, date: string, now: string): DayPlan {
  return {
    date,
    mealSlot: "dinner",
    baseRecipeId: entry.recipe.id,
    adultVariant: deriveAdultVariant(entry),
    childVariant: deriveChildVariant(entry),
    isManualOverride: false,
    editedAt: now,
    sequence: 0,
  };
}

export interface GenerateWeekPlanInput {
  familyId: string;
  weekStartDate: string; // Monday, ISO date
  offers: Offer[];
  offerSnapshotId: string;
}

export function generateWeekPlan({
  familyId,
  weekStartDate,
  offers,
  offerSnapshotId,
}: GenerateWeekPlanInput): WeekPlan {
  const rankedEntries = rankEntriesByOffers(RECIPE_CATALOG, offers);
  const now = new Date().toISOString();

  let state = createInitialVarietyState();
  const days: DayPlan[] = [];

  for (let i = 0; i < 7; i++) {
    const date = addDays(weekStartDate, i);
    const entry = pickEntryForDay(rankedEntries, state);
    days.push(buildDayPlan(entry, date, now));
    state = recordPlacement(entry, state);
  }

  return {
    familyId,
    weekStartDate,
    days,
    generatedFrom: { offerSnapshotId, generatorVersion: GENERATOR_VERSION },
    createdAt: now,
    updatedAt: now,
  };
}
