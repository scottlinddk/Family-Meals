import type { Offer } from "~/domain/types";

/**
 * Swappable seam for weekly-offer data. There is no confirmed ToS-compliant
 * ongoing API for REMA 1000 offers today, so the only implementation wired
 * in is `ManualOfferSource` (data entered/imported by the user). A future
 * pluggable fetcher (e.g. an official API, once confirmed) can implement
 * this same interface without touching any meal-planning logic.
 */
export interface OfferSource {
  fetchCurrentOffers(): Promise<Offer[]>;
}
