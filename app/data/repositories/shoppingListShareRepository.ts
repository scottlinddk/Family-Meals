import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "~/data/db/client";
import { shoppingListShares } from "~/data/db/schema";
import { generateShoppingListShareToken } from "~/lib/tokens";

export interface ShoppingListShare {
  id: string;
  familyId: string;
  weekStartDate: string;
  token: string;
  createdByUserId: string;
  createdAt: string;
  revokedAt: string | null;
}

function toDomain(row: typeof shoppingListShares.$inferSelect): ShoppingListShare {
  return {
    id: row.id,
    familyId: row.familyId,
    weekStartDate: row.weekStartDate,
    token: row.token,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt.toISOString(),
    revokedAt: row.revokedAt?.toISOString() ?? null,
  };
}

export const shoppingListShareRepository = {
  /** The live `/list/{token}` link for one family's week, if there is one. */
  async getActive(familyId: string, weekStartDate: string): Promise<ShoppingListShare | undefined> {
    const [row] = await db
      .select()
      .from(shoppingListShares)
      .where(
        and(
          eq(shoppingListShares.familyId, familyId),
          eq(shoppingListShares.weekStartDate, weekStartDate),
          isNull(shoppingListShares.revokedAt),
        ),
      )
      .orderBy(desc(shoppingListShares.createdAt))
      .limit(1);
    return row ? toDomain(row) : undefined;
  },

  /**
   * Resolves a shared link's token back to its share. Revoked tokens resolve
   * to `undefined` — a link that was taken back has to stop working, not just
   * stop being advertised.
   */
  async getActiveByToken(token: string): Promise<ShoppingListShare | undefined> {
    const [row] = await db
      .select()
      .from(shoppingListShares)
      .where(and(eq(shoppingListShares.token, token), isNull(shoppingListShares.revokedAt)));
    return row ? toDomain(row) : undefined;
  },

  /**
   * Issues a link for a week, reusing the existing one if it's still live.
   *
   * Reuse matters: "share" is a button someone presses again whenever they
   * need the link back, and minting a fresh token each time would silently
   * kill the link already sitting in their partner's messages.
   */
  async getOrCreate(
    familyId: string,
    weekStartDate: string,
    createdByUserId: string,
  ): Promise<ShoppingListShare> {
    const existing = await this.getActive(familyId, weekStartDate);
    if (existing) return existing;

    const [row] = await db
      .insert(shoppingListShares)
      .values({
        familyId,
        weekStartDate,
        token: generateShoppingListShareToken(),
        createdByUserId,
      })
      .returning();
    return toDomain(row!);
  },

  /**
   * Kills every live link for a week. Rows are updated rather than deleted so
   * a revoked token can never be handed out again by a later insert.
   */
  async revokeAll(familyId: string, weekStartDate: string): Promise<void> {
    await db
      .update(shoppingListShares)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(shoppingListShares.familyId, familyId),
          eq(shoppingListShares.weekStartDate, weekStartDate),
          isNull(shoppingListShares.revokedAt),
        ),
      );
  },
};
