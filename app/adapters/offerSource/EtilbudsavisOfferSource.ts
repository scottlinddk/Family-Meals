import type { Offer } from "~/domain/types";
import type { OfferSource } from "~/adapters/offerSource/OfferSource";
import { offerListSchema } from "~/adapters/offerSource/offerSchema";

/**
 * Automatic OfferSource backed by etilbudsavis.dk's public "Tjek" platform
 * API — a third-party tilbudsavis aggregator (not REMA 1000's own webshop),
 * but one that publishes REMA 1000's weekly offers as structured data
 * (name, price, validity period) rather than raw flyer images. This is the
 * "future scraper-based source" the `OfferSource` interface was designed to
 * accommodate — see `app/adapters/offerSource/OfferSource.ts`.
 *
 * NOTE: the Tjek API (api.etilbudsavis.dk/v2) isn't formally documented;
 * this adapter is built from third-party client implementations that use
 * it (e.g. github.com/elvios/discount-getter). The dealer-lookup and
 * offer-search endpoints below returned 403 from this sandbox's network
 * (likely bot protection on the API edge, not a policy block), so the
 * request/response shapes have not been exercised against live traffic —
 * verify against the real API in an environment with normal outbound
 * network access before relying on this in production, and adjust
 * `toOffer`'s field mapping if the live response shape differs.
 */
export class EtilbudsavisOfferSource implements OfferSource {
  private static readonly API_BASE = "https://api.etilbudsavis.dk/v2";
  private static readonly DEALER_QUERY = "REMA 1000";
  private static readonly PAGE_SIZE = 100;

  constructor(private readonly fetchImpl: typeof fetch = fetch) {}

  async fetchCurrentOffers(): Promise<Offer[]> {
    const dealerId = await this.resolveDealerId();
    const raw = await this.fetchOffersForDealer(dealerId);
    const mapped = raw.map((offer) => this.toOfferInput(offer)).filter((o): o is NonNullable<typeof o> => o !== null);

    // Re-validate against the same reference schema manual entry uses, so a
    // shape drift in the third-party API fails loudly instead of silently
    // corrupting the offer set.
    const parsed = offerListSchema.safeParse(mapped);
    if (!parsed.success) {
      throw new Error(
        `EtilbudsavisOfferSource: fetched offers failed schema validation: ${parsed.error.message}`,
      );
    }
    return parsed.data;
  }

  private async resolveDealerId(): Promise<string> {
    const url = `${EtilbudsavisOfferSource.API_BASE}/dealers?query=${encodeURIComponent(
      EtilbudsavisOfferSource.DEALER_QUERY,
    )}`;
    const res = await this.fetchImpl(url);
    if (!res.ok) {
      throw new Error(`EtilbudsavisOfferSource: dealer lookup failed (${res.status})`);
    }
    const dealers = (await res.json()) as Array<{ id: string; name: string }>;
    const rema = dealers.find((d) => d.name?.toLowerCase().includes("rema"));
    if (!rema) {
      throw new Error("EtilbudsavisOfferSource: could not resolve a REMA 1000 dealer id");
    }
    return rema.id;
  }

  private async fetchOffersForDealer(dealerId: string): Promise<TjekOffer[]> {
    const url =
      `${EtilbudsavisOfferSource.API_BASE}/offers/search` +
      `?dealer_ids=${encodeURIComponent(dealerId)}` +
      `&r_locale=da_DK&offset=0&limit=${EtilbudsavisOfferSource.PAGE_SIZE}&order_by=-published`;
    const res = await this.fetchImpl(url);
    if (!res.ok) {
      throw new Error(`EtilbudsavisOfferSource: offer search failed (${res.status})`);
    }
    return (await res.json()) as TjekOffer[];
  }

  private toOfferInput(raw: TjekOffer): OfferInputCandidate | null {
    if (!raw.heading || !raw.run_from || !raw.run_till) return null;
    if (raw.pricing?.currency && raw.pricing.currency !== "DKK") return null;

    const unitSymbol = raw.quantity?.size?.unit?.symbol ?? "stk";
    const unitSizeFrom = raw.quantity?.size?.from ?? 1;
    const unitSizeTo = raw.quantity?.size?.to ?? unitSizeFrom;
    const price = raw.pricing?.price ?? 0;
    const unitPrice = unitSizeTo > 0 ? price / unitSizeTo : price;

    return {
      name: raw.heading,
      unitSizeFrom,
      unitSizeTo,
      unitSymbol,
      price,
      currencyCode: "DKK",
      unitPrice,
      baseUnit: unitSymbol,
      departmentSlug: raw.catalog?.dealer_id ?? "unspecified",
      validFrom: raw.run_from,
      validUntil: raw.run_till,
    };
  }
}

/** Minimal shape of a Tjek API offer object, per third-party client usage. */
interface TjekOffer {
  id: string;
  heading: string;
  run_from: string;
  run_till: string;
  pricing?: { price: number; currency: string };
  quantity?: {
    size?: { from?: number; to?: number; unit?: { symbol?: string } };
  };
  catalog?: { dealer_id?: string };
}

interface OfferInputCandidate {
  name: string;
  unitSizeFrom: number;
  unitSizeTo: number;
  unitSymbol: string;
  price: number;
  currencyCode: "DKK";
  unitPrice: number;
  baseUnit: string;
  departmentSlug: string;
  validFrom: string;
  validUntil: string;
}
