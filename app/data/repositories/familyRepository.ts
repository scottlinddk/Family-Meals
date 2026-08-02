import { eq } from "drizzle-orm";
import { db } from "~/data/db/client";
import { families } from "~/data/db/schema";
import { generateCalendarToken } from "~/lib/tokens";

export interface Family {
  id: string;
  ownerUserId: string;
  calendarToken: string;
  createdAt: string;
}

function toDomain(row: typeof families.$inferSelect): Family {
  return {
    id: row.id,
    ownerUserId: row.ownerUserId,
    calendarToken: row.calendarToken,
    createdAt: row.createdAt.toISOString(),
  };
}

export const familyRepository = {
  async getByOwnerUserId(ownerUserId: string): Promise<Family | undefined> {
    const [row] = await db.select().from(families).where(eq(families.ownerUserId, ownerUserId));
    return row ? toDomain(row) : undefined;
  },

  /** Resolves an ICS subscription URL token back to its family, or undefined if invalid. */
  async getByCalendarToken(token: string): Promise<Family | undefined> {
    const [row] = await db.select().from(families).where(eq(families.calendarToken, token));
    return row ? toDomain(row) : undefined;
  },

  async createFamily(ownerUserId: string): Promise<Family> {
    const [row] = await db
      .insert(families)
      .values({ ownerUserId, calendarToken: generateCalendarToken() })
      .returning();
    return toDomain(row!);
  },

  /** Issues a fresh calendar token (e.g. because the old link leaked), invalidating the old one. */
  async rotateCalendarToken(familyId: string): Promise<Family> {
    const [row] = await db
      .update(families)
      .set({ calendarToken: generateCalendarToken() })
      .where(eq(families.id, familyId))
      .returning();
    if (!row) throw new Error(`Family ${familyId} not found.`);
    return toDomain(row);
  },
};
