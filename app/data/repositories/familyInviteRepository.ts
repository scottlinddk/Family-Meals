import { and, eq } from "drizzle-orm";
import { db } from "~/data/db/client";
import { familyInvites } from "~/data/db/schema";
import { generateInviteToken } from "~/lib/tokens";

export type FamilyInviteStatus = "pending" | "accepted" | "revoked";

export interface FamilyInvite {
  id: string;
  familyId: string;
  email: string;
  token: string;
  invitedByUserId: string;
  status: FamilyInviteStatus;
  createdAt: string;
  expiresAt: string;
  acceptedAt: string | null;
}

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function toDomain(row: typeof familyInvites.$inferSelect): FamilyInvite {
  return {
    id: row.id,
    familyId: row.familyId,
    email: row.email,
    token: row.token,
    invitedByUserId: row.invitedByUserId,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    acceptedAt: row.acceptedAt?.toISOString() ?? null,
  };
}

export const familyInviteRepository = {
  async listPendingByFamily(familyId: string): Promise<FamilyInvite[]> {
    const rows = await db
      .select()
      .from(familyInvites)
      .where(and(eq(familyInvites.familyId, familyId), eq(familyInvites.status, "pending")));
    return rows.map(toDomain);
  },

  async getByToken(token: string): Promise<FamilyInvite | undefined> {
    const [row] = await db.select().from(familyInvites).where(eq(familyInvites.token, token));
    return row ? toDomain(row) : undefined;
  },

  async create(familyId: string, email: string, invitedByUserId: string): Promise<FamilyInvite> {
    const [row] = await db
      .insert(familyInvites)
      .values({
        familyId,
        email: email.trim().toLowerCase(),
        token: generateInviteToken(),
        invitedByUserId,
        expiresAt: new Date(Date.now() + INVITE_TTL_MS),
      })
      .returning();
    return toDomain(row!);
  },

  async markAccepted(id: string): Promise<void> {
    await db.update(familyInvites).set({ status: "accepted", acceptedAt: new Date() }).where(eq(familyInvites.id, id));
  },

  async revoke(id: string, familyId: string): Promise<void> {
    await db
      .update(familyInvites)
      .set({ status: "revoked" })
      .where(and(eq(familyInvites.id, id), eq(familyInvites.familyId, familyId)));
  },
};
