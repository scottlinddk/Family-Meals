import { and, eq, sql } from "drizzle-orm";
import { db } from "~/data/db/client";
import { familyMembers } from "~/data/db/schema";

export type FamilyMemberRole = "owner" | "member";

export interface FamilyMember {
  id: string;
  familyId: string;
  userId: string;
  role: FamilyMemberRole;
  joinedAt: string;
}

function toDomain(row: typeof familyMembers.$inferSelect): FamilyMember {
  return {
    id: row.id,
    familyId: row.familyId,
    userId: row.userId,
    role: row.role,
    joinedAt: row.joinedAt.toISOString(),
  };
}

export const familyMemberRepository = {
  /** The membership row proving `userId` may see/edit `familyId`'s plan, if any. */
  async getMembership(familyId: string, userId: string): Promise<FamilyMember | undefined> {
    const [row] = await db
      .select()
      .from(familyMembers)
      .where(and(eq(familyMembers.familyId, familyId), eq(familyMembers.userId, userId)));
    return row ? toDomain(row) : undefined;
  },

  /** Every family a user belongs to — a user may be a member of several. */
  async getMembershipsForUser(userId: string): Promise<FamilyMember[]> {
    const rows = await db.select().from(familyMembers).where(eq(familyMembers.userId, userId));
    return rows.map(toDomain);
  },

  async listByFamily(familyId: string): Promise<FamilyMember[]> {
    const rows = await db.select().from(familyMembers).where(eq(familyMembers.familyId, familyId));
    return rows.map(toDomain);
  },

  /**
   * Members joined against `auth.users` for display (email). Reads straight
   * from Supabase Auth's schema over the same Postgres connection — there's
   * no service-role admin client configured in this app, so this direct join
   * is how member emails get shown without one.
   */
  async listByFamilyWithEmail(
    familyId: string,
  ): Promise<(FamilyMember & { email: string | null })[]> {
    const rows = await db.execute<{
      id: string;
      family_id: string;
      user_id: string;
      role: FamilyMemberRole;
      joined_at: string;
      email: string | null;
    }>(sql`
      select fm.id, fm.family_id, fm.user_id, fm.role, fm.joined_at, u.email
      from family_members fm
      left join auth.users u on u.id = fm.user_id
      where fm.family_id = ${familyId}
      order by fm.joined_at asc
    `);
    return rows.map((row) => ({
      id: row.id,
      familyId: row.family_id,
      userId: row.user_id,
      role: row.role,
      joinedAt: new Date(row.joined_at).toISOString(),
      email: row.email,
    }));
  },

  async addMember(familyId: string, userId: string, role: FamilyMemberRole): Promise<FamilyMember> {
    const [row] = await db.insert(familyMembers).values({ familyId, userId, role }).returning();
    return toDomain(row!);
  },
};
