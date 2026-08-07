import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { db } from "~/data/db/client";
import { dayPlans, weekPlans } from "~/data/db/schema";
import type { AdultVariant, ChildVariant, DayPlan, WeekPlan } from "~/domain/types";
import { normalizeRecipeSnapshot } from "~/domain/recipes/recipeSnapshot";

/** How many previously-planned weeks the variety rule looks back over. */
const RECENT_WEEK_COUNT = 3;

/** Whatever `db` or a `db.transaction` callback's `tx` can do — the two share this shape. */
type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

function toIsoDate(value: string | Date): string {
  return typeof value === "string" ? value : value.toISOString().slice(0, 10);
}

async function loadWeekPlan(
  client: DbClient,
  weekPlanRow: typeof weekPlans.$inferSelect,
): Promise<WeekPlan> {
  const dayRows = await client
    .select()
    .from(dayPlans)
    .where(eq(dayPlans.weekPlanId, weekPlanRow.id));

  const days: DayPlan[] = dayRows
    .map(
      (row): DayPlan => ({
        date: toIsoDate(row.date),
        mealSlot: row.mealSlot as DayPlan["mealSlot"],
        baseRecipeId: row.baseRecipeId,
        recipeSnapshot: normalizeRecipeSnapshot(row.recipeSnapshot),
        adultVariant: row.adultVariant as AdultVariant,
        childVariant: row.childVariant as ChildVariant,
        isManualOverride: row.isManualOverride,
        editedAt: row.editedAt.toISOString(),
        sequence: row.sequence,
      }),
    )
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    familyId: weekPlanRow.familyId,
    weekStartDate: toIsoDate(weekPlanRow.weekStartDate),
    days,
    generatedFrom: {
      offerSnapshotId: weekPlanRow.offerSnapshotId,
      generatorVersion: weekPlanRow.generatorVersion,
    },
    createdAt: weekPlanRow.createdAt.toISOString(),
    updatedAt: weekPlanRow.updatedAt.toISOString(),
  };
}

export const weekPlanRepository = {
  async getWeekPlan(familyId: string, weekStartDate: string): Promise<WeekPlan | undefined> {
    const [row] = await db
      .select()
      .from(weekPlans)
      .where(and(eq(weekPlans.familyId, familyId), eq(weekPlans.weekStartDate, weekStartDate)));
    return row ? loadWeekPlan(db, row) : undefined;
  },

  /**
   * Recipe ids the family has planned in their most recent weeks, excluding
   * `excludeWeekStartDate` (the week being regenerated). Feeds the
   * generator's cross-week variety rule.
   */
  async listRecentRecipeIds(
    familyId: string,
    excludeWeekStartDate: string,
    weekCount = RECENT_WEEK_COUNT,
  ): Promise<string[]> {
    const recentWeeks = await db
      .select({ id: weekPlans.id })
      .from(weekPlans)
      .where(and(eq(weekPlans.familyId, familyId), ne(weekPlans.weekStartDate, excludeWeekStartDate)))
      .orderBy(desc(weekPlans.weekStartDate))
      .limit(weekCount);

    if (recentWeeks.length === 0) return [];

    const rows = await db
      .select({ baseRecipeId: dayPlans.baseRecipeId })
      .from(dayPlans)
      .where(
        inArray(
          dayPlans.weekPlanId,
          recentWeeks.map((week) => week.id),
        ),
      );

    return [...new Set(rows.map((row) => row.baseRecipeId))];
  },

  /**
   * The single write path for a week plan: upserts the week row and
   * replaces all seven day rows atomically in one transaction. All mutation
   * flows (initial generation, regenerate-day, swap-recipe, manual edits)
   * must go through this — never update `day_plans` rows directly — so the
   * ICS `sequence`/`editedAt` bump computed in domain logic (see
   * regenerateDay.ts) is always what actually lands in the database.
   */
  async saveWeekPlan(week: WeekPlan): Promise<WeekPlan> {
    return db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(weekPlans)
        .where(
          and(eq(weekPlans.familyId, week.familyId), eq(weekPlans.weekStartDate, week.weekStartDate)),
        );

      const weekPlanRow = existing
        ? (
            await tx
              .update(weekPlans)
              .set({
                offerSnapshotId: week.generatedFrom.offerSnapshotId,
                generatorVersion: week.generatedFrom.generatorVersion,
                updatedAt: new Date(),
              })
              .where(eq(weekPlans.id, existing.id))
              .returning()
          )[0]!
        : (
            await tx
              .insert(weekPlans)
              .values({
                familyId: week.familyId,
                weekStartDate: week.weekStartDate,
                offerSnapshotId: week.generatedFrom.offerSnapshotId,
                generatorVersion: week.generatedFrom.generatorVersion,
              })
              .returning()
          )[0]!;

      await tx.delete(dayPlans).where(eq(dayPlans.weekPlanId, weekPlanRow.id));
      await tx.insert(dayPlans).values(
        week.days.map((day) => ({
          weekPlanId: weekPlanRow.id,
          date: day.date,
          mealSlot: day.mealSlot,
          baseRecipeId: day.baseRecipeId,
          recipeSnapshot: day.recipeSnapshot,
          adultVariant: day.adultVariant,
          childVariant: day.childVariant,
          isManualOverride: day.isManualOverride,
          editedAt: new Date(day.editedAt),
          sequence: day.sequence,
        })),
      );

      return loadWeekPlan(tx, weekPlanRow);
    });
  },
};
