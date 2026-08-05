import { and, eq, inArray } from "drizzle-orm";
import { db } from "~/data/db/client";
import { shoppingListChecks } from "~/data/db/schema";

/**
 * Which lines of a week's shopping list the family has already picked up.
 *
 * Stored as one row per ticked label (see `shoppingListChecks` in the schema
 * for why the label is the identity), so every operation here is a set
 * operation: read the set, add a member, remove a member, empty it.
 */
export const shoppingListCheckRepository = {
  /** The ticked labels for one family's week, in no particular order. */
  async listChecked(familyId: string, weekStartDate: string): Promise<string[]> {
    const rows = await db
      .select({ itemLabel: shoppingListChecks.itemLabel })
      .from(shoppingListChecks)
      .where(
        and(
          eq(shoppingListChecks.familyId, familyId),
          eq(shoppingListChecks.weekStartDate, weekStartDate),
        ),
      );
    return rows.map((row) => row.itemLabel);
  },

  /**
   * Ticks or unticks one line, returning the family's whole resulting set.
   *
   * Returning the full set rather than an acknowledgement is deliberate: the
   * caller is a phone in a shop that may have been offline for the last three
   * items, and one round trip that also brings back whatever the other
   * shopper ticked meanwhile is worth more than a smaller response.
   *
   * The insert is an idempotent upsert on (family, week, label) so two people
   * tapping the same line at once can't collide, and `checkedByUserId` is
   * refreshed so the row reflects whoever most recently claimed it.
   */
  async setChecked(
    familyId: string,
    weekStartDate: string,
    itemLabel: string,
    checked: boolean,
    checkedByUserId: string | null,
  ): Promise<string[]> {
    if (checked) {
      await db
        .insert(shoppingListChecks)
        .values({ familyId, weekStartDate, itemLabel, checkedByUserId })
        .onConflictDoUpdate({
          target: [
            shoppingListChecks.familyId,
            shoppingListChecks.weekStartDate,
            shoppingListChecks.itemLabel,
          ],
          set: { checkedByUserId, checkedAt: new Date() },
        });
    } else {
      await db
        .delete(shoppingListChecks)
        .where(
          and(
            eq(shoppingListChecks.familyId, familyId),
            eq(shoppingListChecks.weekStartDate, weekStartDate),
            eq(shoppingListChecks.itemLabel, itemLabel),
          ),
        );
    }

    return this.listChecked(familyId, weekStartDate);
  },

  /**
   * Unticks everything for a week.
   *
   * `labels` narrows the clear to the lines the caller could actually see, so
   * "reset" from a list that has since been regenerated doesn't also wipe
   * ticks belonging to lines the caller never had on screen. Omit it to clear
   * the week outright.
   */
  async clear(familyId: string, weekStartDate: string, labels?: string[]): Promise<void> {
    if (labels && labels.length === 0) return;

    await db
      .delete(shoppingListChecks)
      .where(
        and(
          eq(shoppingListChecks.familyId, familyId),
          eq(shoppingListChecks.weekStartDate, weekStartDate),
          ...(labels ? [inArray(shoppingListChecks.itemLabel, labels)] : []),
        ),
      );
  },
};
