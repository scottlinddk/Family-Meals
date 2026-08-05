import { and, eq, inArray } from "drizzle-orm";
import { db } from "~/data/db/client";
import { shoppingListMarks } from "~/data/db/schema";
import type {
  ShoppingListItemStatus,
  ShoppingListMark,
} from "~/domain/planning/shoppingListMarks";

/**
 * The marks on a week's shopping list.
 *
 * Stored as one row per marked label (see `shoppingListMarks` in the schema
 * for why the label is the identity), so every operation here is a map
 * operation: read the marks, set one, remove one, empty them.
 */
export const shoppingListMarkRepository = {
  /** The marked lines for one family's week, in no particular order. */
  async listMarks(familyId: string, weekStartDate: string): Promise<ShoppingListMark[]> {
    return db
      .select({ label: shoppingListMarks.itemLabel, status: shoppingListMarks.status })
      .from(shoppingListMarks)
      .where(
        and(
          eq(shoppingListMarks.familyId, familyId),
          eq(shoppingListMarks.weekStartDate, weekStartDate),
        ),
      );
  },

  /**
   * Marks one line, or clears its mark when `status` is null, returning the
   * family's whole resulting set of marks.
   *
   * Returning everything rather than an acknowledgement is deliberate: the
   * caller is a phone in a shop that may have been offline for the last three
   * items, and one round trip that also brings back whatever the other
   * shopper marked meanwhile is worth more than a smaller response.
   *
   * The insert is an idempotent upsert on (family, week, label), so two people
   * tapping the same line at once can't collide — and moving a line straight
   * from "we've got some" to "it's in the trolley" is the same single write.
   */
  async setMark(
    familyId: string,
    weekStartDate: string,
    itemLabel: string,
    status: ShoppingListItemStatus | null,
    markedByUserId: string | null,
  ): Promise<ShoppingListMark[]> {
    if (status) {
      await db
        .insert(shoppingListMarks)
        .values({ familyId, weekStartDate, itemLabel, status, markedByUserId })
        .onConflictDoUpdate({
          target: [
            shoppingListMarks.familyId,
            shoppingListMarks.weekStartDate,
            shoppingListMarks.itemLabel,
          ],
          set: { status, markedByUserId, markedAt: new Date() },
        });
    } else {
      await db
        .delete(shoppingListMarks)
        .where(
          and(
            eq(shoppingListMarks.familyId, familyId),
            eq(shoppingListMarks.weekStartDate, weekStartDate),
            eq(shoppingListMarks.itemLabel, itemLabel),
          ),
        );
    }

    return this.listMarks(familyId, weekStartDate);
  },

  /**
   * Unmarks everything for a week — the ticks and the at-home marks alike,
   * since "start this list over" means all of it.
   *
   * `labels` narrows the reset to the lines the caller could actually see, so
   * clearing a list that has since been regenerated doesn't also wipe marks
   * belonging to lines the caller never had on screen. Omit it to clear the
   * week outright.
   */
  async clear(familyId: string, weekStartDate: string, labels?: string[]): Promise<void> {
    if (labels && labels.length === 0) return;

    await db
      .delete(shoppingListMarks)
      .where(
        and(
          eq(shoppingListMarks.familyId, familyId),
          eq(shoppingListMarks.weekStartDate, weekStartDate),
          ...(labels ? [inArray(shoppingListMarks.itemLabel, labels)] : []),
        ),
      );
  },
};
