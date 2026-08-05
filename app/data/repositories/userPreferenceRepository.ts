import { eq } from "drizzle-orm";
import { db } from "~/data/db/client";
import { userPreferences } from "~/data/db/schema";
import {
  DEFAULT_USER_PREFERENCES,
  type CookViewMode,
  type UserPreferences,
} from "~/domain/preferences";

function toDomain(row: typeof userPreferences.$inferSelect): UserPreferences {
  return { cookViewMode: row.cookViewMode };
}

export const userPreferenceRepository = {
  /**
   * This user's preferences, falling back to the defaults. A missing row is
   * the normal state for anyone who hasn't changed anything — rows are only
   * written when a preference is actually set.
   */
  async get(userId: string): Promise<UserPreferences> {
    const [row] = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId));
    return row ? toDomain(row) : DEFAULT_USER_PREFERENCES;
  },

  /** Upsert, so the first change writes the row and later ones update it. */
  async setCookViewMode(userId: string, cookViewMode: CookViewMode): Promise<UserPreferences> {
    const [row] = await db
      .insert(userPreferences)
      .values({ userId, cookViewMode })
      .onConflictDoUpdate({
        target: userPreferences.userId,
        set: { cookViewMode, updatedAt: new Date() },
      })
      .returning();
    return toDomain(row!);
  },
};
