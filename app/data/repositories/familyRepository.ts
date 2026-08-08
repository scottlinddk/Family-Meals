import { eq } from "drizzle-orm";
import { db } from "~/data/db/client";
import { families } from "~/data/db/schema";
import { generateCalendarToken } from "~/lib/tokens";

export interface Family {
  id: string;
  ownerUserId: string;
  name: string | null;
  calendarToken: string;
  createdAt: string;
}

export function familyToDomain(row: typeof families.$inferSelect): Family {
  return {
    id: row.id,
    ownerUserId: row.ownerUserId,
    name: row.name,
    calendarToken: row.calendarToken,
    createdAt: row.createdAt.toISOString(),
  };
}

export const familyRepository = {
  async getById(id: string): Promise<Family | undefined> {
    const [row] = await db.select().from(families).where(eq(families.id, id));
    return row ? familyToDomain(row) : undefined;
  },

  /** Every family, for the scheduled offer refresh — there's no per-family session to key off. */
  async listAll(): Promise<Family[]> {
    const rows = await db.select().from(families);
    return rows.map(familyToDomain);
  },

  async getByOwnerUserId(ownerUserId: string): Promise<Family | undefined> {
    const [row] = await db.select().from(families).where(eq(families.ownerUserId, ownerUserId));
    return row ? familyToDomain(row) : undefined;
  },

  /** Resolves an ICS subscription URL token back to its family, or undefined if invalid. */
  async getByCalendarToken(token: string): Promise<Family | undefined> {
    const [row] = await db.select().from(families).where(eq(families.calendarToken, token));
    return row ? familyToDomain(row) : undefined;
  },

  async createFamily(ownerUserId: string, name?: string): Promise<Family> {
    const [row] = await db
      .insert(families)
      .values({ ownerUserId, name: name?.trim() || null, calendarToken: generateCalendarToken() })
      .returning();
    return familyToDomain(row!);
  },

  async rename(familyId: string, name: string): Promise<Family> {
    const [row] = await db
      .update(families)
      .set({ name: name.trim() || null })
      .where(eq(families.id, familyId))
      .returning();
    if (!row) throw new Error(`Family ${familyId} not found.`);
    return familyToDomain(row);
  },

  /** Issues a fresh calendar token (e.g. because the old link leaked), invalidating the old one. */
  async rotateCalendarToken(familyId: string): Promise<Family> {
    const [row] = await db
      .update(families)
      .set({ calendarToken: generateCalendarToken() })
      .where(eq(families.id, familyId))
      .returning();
    if (!row) throw new Error(`Family ${familyId} not found.`);
    return familyToDomain(row);
  },
};
