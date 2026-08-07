import { and, eq } from "drizzle-orm";
import { db } from "~/data/db/client";
import { shoppingListExtraItems } from "~/data/db/schema";

/**
 * Ingredients a family added to one week's shopping list by hand — see
 * `shoppingListExtraItems` in the schema. Every operation here is a map
 * operation on that set: read the week's added labels, add one, remove one.
 */
export const shoppingListExtraItemRepository = {
  /** The family's manually added labels for one week, in no particular order. */
  async listLabels(familyId: string, weekStartDate: string): Promise<string[]> {
    const rows = await db
      .select({ itemLabel: shoppingListExtraItems.itemLabel })
      .from(shoppingListExtraItems)
      .where(
        and(
          eq(shoppingListExtraItems.familyId, familyId),
          eq(shoppingListExtraItems.weekStartDate, weekStartDate),
        ),
      );
    return rows.map((row) => row.itemLabel);
  },

  /** Adds an item. Idempotent — adding the same label twice is a no-op. */
  async add(
    familyId: string,
    weekStartDate: string,
    itemLabel: string,
    addedByUserId: string | null,
  ): Promise<void> {
    await db
      .insert(shoppingListExtraItems)
      .values({ familyId, weekStartDate, itemLabel, addedByUserId })
      .onConflictDoNothing();
  },

  /** Removes an item, e.g. after it's been bought or added by mistake. */
  async remove(familyId: string, weekStartDate: string, itemLabel: string): Promise<void> {
    await db
      .delete(shoppingListExtraItems)
      .where(
        and(
          eq(shoppingListExtraItems.familyId, familyId),
          eq(shoppingListExtraItems.weekStartDate, weekStartDate),
          eq(shoppingListExtraItems.itemLabel, itemLabel),
        ),
      );
  },
};
