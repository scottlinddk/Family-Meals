import { desc } from "drizzle-orm";
import { db } from "~/data/db/client";
import { offers as offersTable } from "~/data/db/schema";
import type { Offer } from "~/domain/types";
import type { OfferInput } from "~/adapters/offerSource/offerSchema";
import type { OfferReader } from "~/adapters/offerSource/ManualOfferSource";

function toDomain(row: typeof offersTable.$inferSelect): Offer {
  return {
    name: row.name,
    unitSizeFrom: row.unitSizeFrom,
    unitSizeTo: row.unitSizeTo,
    unitSymbol: row.unitSymbol,
    price: row.price,
    currencyCode: row.currencyCode as Offer["currencyCode"],
    unitPrice: row.unitPrice,
    baseUnit: row.baseUnit,
    departmentSlug: row.departmentSlug,
    validFrom: row.validFrom.toISOString(),
    validUntil: row.validUntil.toISOString(),
  };
}

/** Implements OfferReader so it can back the default ManualOfferSource. */
export const offerRepository: OfferReader & {
  replaceCurrentOffers(offers: OfferInput[]): Promise<void>;
} = {
  async listCurrentOffers(): Promise<Offer[]> {
    const rows = await db.select().from(offersTable).orderBy(desc(offersTable.importedAt));
    return rows.map(toDomain);
  },

  /** Replaces the whole current offer set with a fresh import (manual entry/JSON paste). */
  async replaceCurrentOffers(offers: OfferInput[]): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.delete(offersTable);
      if (offers.length === 0) return;
      await tx.insert(offersTable).values(
        offers.map((offer) => ({
          name: offer.name,
          unitSizeFrom: offer.unitSizeFrom,
          unitSizeTo: offer.unitSizeTo,
          unitSymbol: offer.unitSymbol,
          price: offer.price,
          currencyCode: offer.currencyCode,
          unitPrice: offer.unitPrice,
          baseUnit: offer.baseUnit,
          departmentSlug: offer.departmentSlug,
          validFrom: new Date(offer.validFrom),
          validUntil: new Date(offer.validUntil),
        })),
      );
    });
  },
};
