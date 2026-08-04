import type { Offer } from "~/domain/types";
import type { OfferSource } from "~/adapters/offerSource/OfferSource";

/** Minimal shape this adapter needs from the persistence layer. */
export interface OfferReader {
  listCurrentOffers(familyId: string): Promise<Offer[]>;
}

/**
 * Default OfferSource implementation: offers entered/imported by the user
 * via the manual form or JSON paste, read back out of the database. This is
 * the "safe default" data source described in the project plan — no
 * scraping, no third-party ToS risk.
 */
export class ManualOfferSource implements OfferSource {
  constructor(
    private readonly reader: OfferReader,
    private readonly familyId: string,
  ) {}

  async fetchCurrentOffers(): Promise<Offer[]> {
    return this.reader.listCurrentOffers(this.familyId);
  }
}
