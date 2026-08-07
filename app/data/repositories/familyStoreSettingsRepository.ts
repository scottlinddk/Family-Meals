import { eq } from "drizzle-orm";
import { db } from "~/data/db/client";
import { familyStoreSettings } from "~/data/db/schema";
import { DEFAULT_FAMILY_STORE_SETTINGS, type FamilyStoreSettings } from "~/domain/familyStoreSettings";
import type { StoreId } from "~/domain/types";

function toDomain(row: typeof familyStoreSettings.$inferSelect): FamilyStoreSettings {
  return {
    selectedStores: row.selectedStores as StoreId[],
    memberStores: row.memberStores as StoreId[],
  };
}

export const familyStoreSettingsRepository = {
  /**
   * This family's store settings, falling back to the defaults. A missing
   * row is the normal state for a family that hasn't changed anything —
   * rows are only written when a setting is actually changed.
   */
  async get(familyId: string): Promise<FamilyStoreSettings> {
    const [row] = await db
      .select()
      .from(familyStoreSettings)
      .where(eq(familyStoreSettings.familyId, familyId));
    return row ? toDomain(row) : DEFAULT_FAMILY_STORE_SETTINGS;
  },

  /** Upsert, so the first change writes the row and later ones update it. */
  async set(familyId: string, settings: FamilyStoreSettings): Promise<FamilyStoreSettings> {
    const [row] = await db
      .insert(familyStoreSettings)
      .values({
        familyId,
        selectedStores: settings.selectedStores,
        memberStores: settings.memberStores,
      })
      .onConflictDoUpdate({
        target: familyStoreSettings.familyId,
        set: {
          selectedStores: settings.selectedStores,
          memberStores: settings.memberStores,
          updatedAt: new Date(),
        },
      })
      .returning();
    return toDomain(row!);
  },
};
