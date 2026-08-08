import { and, eq } from "drizzle-orm";
import { db } from "~/data/db/client";
import { ingredientOfferOverrides } from "~/data/db/schema";

export interface IngredientOfferOverride {
  ingredientLabel: string;
  offerName: string;
}

/**
 * Ingredient↔offer pairings a family has flagged as wrong (see
 * `ingredientOfferOverrides` in the schema for why this exists). Every
 * operation here is a map operation on that flag: read the family's flags,
 * set one, clear one.
 */
export const ingredientOfferOverrideRepository = {
  /** The family's flagged pairings, in no particular order. */
  async listExcluded(familyId: string): Promise<IngredientOfferOverride[]> {
    return db
      .select({
        ingredientLabel: ingredientOfferOverrides.ingredientLabel,
        offerName: ingredientOfferOverrides.offerName,
      })
      .from(ingredientOfferOverrides)
      .where(eq(ingredientOfferOverrides.familyId, familyId));
  },

  /** Flags a pairing as wrong. Idempotent — flagging twice is a no-op. */
  async exclude(
    familyId: string,
    ingredientLabel: string,
    offerName: string,
    createdByUserId: string | null,
  ): Promise<void> {
    await db
      .insert(ingredientOfferOverrides)
      .values({ familyId, ingredientLabel, offerName, createdByUserId })
      .onConflictDoNothing();
  },

  /** Un-flags a pairing, letting it match normally again. */
  async unexclude(familyId: string, ingredientLabel: string, offerName: string): Promise<void> {
    await db
      .delete(ingredientOfferOverrides)
      .where(
        and(
          eq(ingredientOfferOverrides.familyId, familyId),
          eq(ingredientOfferOverrides.ingredientLabel, ingredientLabel),
          eq(ingredientOfferOverrides.offerName, offerName),
        ),
      );
  },
};
