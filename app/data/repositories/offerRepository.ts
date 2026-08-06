import { and, asc, desc, eq, gt, gte, lte } from "drizzle-orm";
import { db } from "~/data/db/client";
import { offers as offersTable, offerSnapshots } from "~/data/db/schema";
import type { Offer } from "~/domain/types";
import type { OfferInput } from "~/adapters/offerSource/offerSchema";
import type { OfferReader } from "~/adapters/offerSource/ManualOfferSource";

export type OfferSnapshotSource = "manual" | "etilbudsavis";

export interface OfferSnapshot {
  id: string;
  source: OfferSnapshotSource;
  offerCount: number;
  /** Earliest/latest validity across the snapshot's offers; null when it's empty. */
  validFrom: string | null;
  validUntil: string | null;
  importedAt: string;
}

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

function toSnapshotDomain(row: typeof offerSnapshots.$inferSelect): OfferSnapshot {
  return {
    id: row.id,
    source: row.source,
    offerCount: row.offerCount,
    validFrom: row.validFrom?.toISOString() ?? null,
    validUntil: row.validUntil?.toISOString() ?? null,
    importedAt: row.importedAt.toISOString(),
  };
}

async function latestSnapshotRow(familyId: string) {
  const [row] = await db
    .select()
    .from(offerSnapshots)
    .where(eq(offerSnapshots.familyId, familyId))
    .orderBy(desc(offerSnapshots.importedAt))
    .limit(1);
  return row;
}

/** Implements OfferReader so it can back the default ManualOfferSource. */
export const offerRepository: OfferReader & {
  getLatestSnapshot(familyId: string): Promise<OfferSnapshot | undefined>;
  listOffersInSnapshot(snapshotId: string): Promise<Offer[]>;
  listOffersValidDuring(familyId: string, from: Date, to: Date): Promise<Offer[]>;
  listUpcomingOffers(familyId: string): Promise<Offer[]>;
  replaceCurrentOffers(
    familyId: string,
    offers: OfferInput[],
    source: OfferSnapshotSource,
  ): Promise<OfferSnapshot>;
} = {
  /**
   * The family's most recent import, narrowed to offers that are valid *now*
   * — an import doesn't stop being the latest just because its offers have
   * since expired, and planning against last week's discounts is worse than
   * planning against none.
   */
  async listCurrentOffers(familyId: string): Promise<Offer[]> {
    const now = new Date();
    return offerRepository.listOffersValidDuring(familyId, now, now);
  },

  async getLatestSnapshot(familyId: string): Promise<OfferSnapshot | undefined> {
    const row = await latestSnapshotRow(familyId);
    return row ? toSnapshotDomain(row) : undefined;
  },

  async listOffersInSnapshot(snapshotId: string): Promise<Offer[]> {
    const rows = await db
      .select()
      .from(offersTable)
      .where(eq(offersTable.snapshotId, snapshotId))
      .orderBy(asc(offersTable.name));
    return rows.map(toDomain);
  },

  /**
   * Offers from the family's latest import whose validity window overlaps
   * `from`–`to`. Used to plan a specific week against the offers that
   * actually apply during it rather than whatever was imported last.
   */
  async listOffersValidDuring(familyId: string, from: Date, to: Date): Promise<Offer[]> {
    const snapshot = await latestSnapshotRow(familyId);
    if (!snapshot) return [];

    const rows = await db
      .select()
      .from(offersTable)
      .where(
        and(
          eq(offersTable.snapshotId, snapshot.id),
          lte(offersTable.validFrom, to),
          gte(offersTable.validUntil, from),
        ),
      )
      .orderBy(asc(offersTable.name));
    return rows.map(toDomain);
  },

  /**
   * Offers from the family's latest import that haven't started yet — REMA's
   * next catalog, once `EtilbudsavisOfferSource` has picked it up ahead of
   * this week's ending. Lets the offers page show what's coming without
   * mixing it into "on offer now".
   */
  async listUpcomingOffers(familyId: string): Promise<Offer[]> {
    const snapshot = await latestSnapshotRow(familyId);
    if (!snapshot) return [];

    const now = new Date();
    const rows = await db
      .select()
      .from(offersTable)
      .where(and(eq(offersTable.snapshotId, snapshot.id), gt(offersTable.validFrom, now)))
      .orderBy(asc(offersTable.validFrom), asc(offersTable.name));
    return rows.map(toDomain);
  },

  /**
   * Records a fresh import as a new snapshot for this family. Previous
   * snapshots are left in place so week plans generated from them stay
   * explainable; only the newest one is treated as current.
   */
  async replaceCurrentOffers(
    familyId: string,
    offers: OfferInput[],
    source: OfferSnapshotSource,
  ): Promise<OfferSnapshot> {
    const validFroms = offers.map((offer) => new Date(offer.validFrom).getTime());
    const validUntils = offers.map((offer) => new Date(offer.validUntil).getTime());

    return db.transaction(async (tx) => {
      const [snapshot] = await tx
        .insert(offerSnapshots)
        .values({
          familyId,
          source,
          offerCount: offers.length,
          validFrom: validFroms.length > 0 ? new Date(Math.min(...validFroms)) : null,
          validUntil: validUntils.length > 0 ? new Date(Math.max(...validUntils)) : null,
        })
        .returning();

      if (offers.length > 0) {
        await tx.insert(offersTable).values(
          offers.map((offer) => ({
            snapshotId: snapshot!.id,
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
      }

      return toSnapshotDomain(snapshot!);
    });
  },
};
