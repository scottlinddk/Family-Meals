import { and, desc, eq, isNull, type SQL } from "drizzle-orm";
import { db } from "~/data/db/client";
import { planShares } from "~/data/db/schema";
import type { ShareTarget } from "~/domain/sharing/shareTarget";
import { generatePlanShareToken } from "~/lib/tokens";

export interface PlanShare {
  id: string;
  familyId: string;
  target: ShareTarget;
  token: string;
  createdByUserId: string;
  createdAt: string;
  revokedAt: string | null;
}

function toIsoDate(value: string | Date): string {
  return typeof value === "string" ? value : value.toISOString().slice(0, 10);
}

/**
 * Rebuilds the target from the row's three nullable columns.
 *
 * A row whose own column is empty is corrupt rather than merely odd — it
 * would resolve to a share of nothing — so it's reported as unresolvable and
 * the routes answer 404, the same as an unknown token.
 */
function toDomain(row: typeof planShares.$inferSelect): PlanShare | undefined {
  let target: ShareTarget;
  switch (row.kind) {
    case "week":
      if (!row.weekStartDate) return undefined;
      target = { kind: "week", weekStartDate: toIsoDate(row.weekStartDate) };
      break;
    case "day":
      if (!row.dayDate) return undefined;
      target = { kind: "day", date: toIsoDate(row.dayDate) };
      break;
    case "recipe":
      if (!row.recipeId) return undefined;
      target = { kind: "recipe", recipeId: row.recipeId };
      break;
  }

  return {
    id: row.id,
    familyId: row.familyId,
    target,
    token: row.token,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt.toISOString(),
    revokedAt: row.revokedAt?.toISOString() ?? null,
  };
}

/** Matches exactly the rows sharing this one thing — kind *and* its own column. */
function matchesTarget(familyId: string, target: ShareTarget): SQL | undefined {
  const columnMatch =
    target.kind === "week"
      ? eq(planShares.weekStartDate, target.weekStartDate)
      : target.kind === "day"
        ? eq(planShares.dayDate, target.date)
        : eq(planShares.recipeId, target.recipeId);

  return and(
    eq(planShares.familyId, familyId),
    eq(planShares.kind, target.kind),
    columnMatch,
    isNull(planShares.revokedAt),
  );
}

/** The columns a new row sets for this target; the other two stay null. */
function targetColumns(target: ShareTarget) {
  return {
    kind: target.kind,
    weekStartDate: target.kind === "week" ? target.weekStartDate : null,
    dayDate: target.kind === "day" ? target.date : null,
    recipeId: target.kind === "recipe" ? target.recipeId : null,
  };
}

export const planShareRepository = {
  /** The live `/share/{token}` link for one thing, if the family has issued one. */
  async getActive(familyId: string, target: ShareTarget): Promise<PlanShare | undefined> {
    const [row] = await db
      .select()
      .from(planShares)
      .where(matchesTarget(familyId, target))
      .orderBy(desc(planShares.createdAt))
      .limit(1);
    return row ? toDomain(row) : undefined;
  },

  /**
   * Resolves a link's token back to its share. Revoked tokens resolve to
   * `undefined` — a link that was taken back has to stop working, not just
   * stop being advertised.
   */
  async getActiveByToken(token: string): Promise<PlanShare | undefined> {
    const [row] = await db
      .select()
      .from(planShares)
      .where(and(eq(planShares.token, token), isNull(planShares.revokedAt)));
    return row ? toDomain(row) : undefined;
  },

  /**
   * Issues a link, reusing the live one if there is one.
   *
   * Reuse matters for the same reason it does on the shopping list: "share"
   * is a button someone presses again whenever they need the link back, and
   * minting a fresh token each time would silently kill the one already
   * sitting in a message thread.
   */
  async getOrCreate(
    familyId: string,
    target: ShareTarget,
    createdByUserId: string,
  ): Promise<PlanShare> {
    const existing = await this.getActive(familyId, target);
    if (existing) return existing;

    const [row] = await db
      .insert(planShares)
      .values({
        familyId,
        ...targetColumns(target),
        token: generatePlanShareToken(),
        createdByUserId,
      })
      .returning();
    // A row we just wrote from a valid target always resolves.
    return toDomain(row!)!;
  },

  /**
   * Kills every live link for one thing. Rows are updated rather than deleted
   * so a revoked token can never be handed out again by a later insert.
   */
  async revokeAll(familyId: string, target: ShareTarget): Promise<void> {
    await db.update(planShares).set({ revokedAt: new Date() }).where(matchesTarget(familyId, target));
  },
};
