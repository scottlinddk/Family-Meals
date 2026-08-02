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
 * Flow: resolve REMA 1000's dealer id, find its current catalog (weekly
 * flyer), then list that catalog's offers. `/v2/offers/search` looks like
 * the obvious endpoint but requires a non-empty `query` (returns
 * `MISSING_QUERY` otherwise) — there's no per-dealer "list everything"
 * search, so we go through the catalog instead.
 *
 * Endpoint shapes and field mappings below (dealer id "11deC", catalog id
 * shape, `quantity.unit` as a sibling of `quantity.size`, no `unitPrice`
 * field — computed from `size.to × unit.si.factor`) were verified against
 * live API responses fetched from outside this project's dev sandbox
 * (whose outbound requests get 403'd by bot protection on api.etilbudsavis.dk).
 */
export class EtilbudsavisOfferSource implements OfferSource {
  private static readonly API_BASE = "https://api.etilbudsavis.dk/v2";
  private static readonly DEALER_QUERY = "REMA 1000";
  private static readonly PAGE_SIZE = 100;

  constructor(private readonly fetchImpl: typeof fetch = fetch) {}

  async fetchCurrentOffers(): Promise<Offer[]> {
    const dealerId = await this.resolveDealerId();
    const catalog = await this.resolveCurrentCatalog(dealerId);
    const raw = await this.fetchOffersForCatalog(catalog.id);
    const departmentSlug = catalog.categoryIds[0] ?? "unspecified";

    const mapped = raw
      .map((offer) => this.toOfferInput(offer, departmentSlug))
      .filter((o): o is NonNullable<typeof o> => o !== null);

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

  private async resolveCurrentCatalog(
    dealerId: string,
  ): Promise<{ id: string; categoryIds: string[] }> {
    const url =
      `${EtilbudsavisOfferSource.API_BASE}/catalogs` +
      `?dealer_ids=${encodeURIComponent(dealerId)}&order_by=-publication_date&offset=0&limit=1`;
    const res = await this.fetchImpl(url);
    if (!res.ok) {
      throw new Error(`EtilbudsavisOfferSource: catalog lookup failed (${res.status})`);
    }
    const catalogs = (await res.json()) as Array<{ id: string; category_ids?: string[] }>;
    const current = catalogs[0];
    if (!current) {
      throw new Error("EtilbudsavisOfferSource: REMA 1000 has no current catalog");
    }
    return { id: current.id, categoryIds: current.category_ids ?? [] };
  }

  private async fetchOffersForCatalog(catalogId: string): Promise<TjekOffer[]> {
    const offers: TjekOffer[] = [];
    let offset = 0;
    // Safety cap: 10 pages (1000 offers) is far beyond a single weekly
    // catalog's offer count, so this only guards against an unexpected
    // non-terminating response shape.
    for (let page = 0; page < 10; page++) {
      const url =
        `${EtilbudsavisOfferSource.API_BASE}/offers` +
        `?catalog_ids=${encodeURIComponent(catalogId)}&offset=${offset}&limit=${EtilbudsavisOfferSource.PAGE_SIZE}`;
      const res = await this.fetchImpl(url);
      if (!res.ok) {
        throw new Error(`EtilbudsavisOfferSource: offer list failed (${res.status})`);
      }
      const batch = (await res.json()) as TjekOffer[];
      offers.push(...batch);
      if (batch.length < EtilbudsavisOfferSource.PAGE_SIZE) break;
      offset += EtilbudsavisOfferSource.PAGE_SIZE;
    }
    return offers;
  }

  private toOfferInput(raw: TjekOffer, departmentSlug: string): OfferInputCandidate | null {
    if (!raw.heading || !raw.run_from || !raw.run_till) return null;
    if (raw.pricing?.currency && raw.pricing.currency !== "DKK") return null;

    const unitSymbol = raw.quantity?.unit?.symbol ?? "stk";
    const siSymbol = raw.quantity?.unit?.si?.symbol;
    const siFactor = raw.quantity?.unit?.si?.factor;
    const unitSizeFrom = raw.quantity?.size?.from ?? 1;
    const unitSizeTo = raw.quantity?.size?.to ?? unitSizeFrom;
    const price = raw.pricing?.price ?? 0;

    const sizeInBaseUnit = siFactor ? unitSizeTo * siFactor : unitSizeTo;
    const unitPrice = sizeInBaseUnit > 0 ? price / sizeInBaseUnit : price;

    return {
      name: raw.heading,
      unitSizeFrom,
      unitSizeTo,
      unitSymbol,
      price,
      currencyCode: "DKK",
      unitPrice,
      baseUnit: baseUnitName(siSymbol ?? unitSymbol),
      departmentSlug,
      validFrom: raw.run_from,
      validUntil: raw.run_till,
    };
  }
}

/** REMA's own manual-entry reference schema spells units out ("kilogram", not "kg"). */
const BASE_UNIT_NAMES: Record<string, string> = {
  kg: "kilogram",
  g: "gram",
  l: "liter",
  cl: "liter",
  ml: "liter",
  stk: "styk",
};

function baseUnitName(symbol: string): string {
  return BASE_UNIT_NAMES[symbol] ?? symbol;
}

/** Shape of a Tjek API offer object (`/v2/offers?catalog_ids=...`), verified against live data. */
interface TjekOffer {
  heading: string;
  run_from: string;
  run_till: string;
  pricing?: { price: number; currency: string };
  quantity?: {
    unit?: { symbol?: string; si?: { symbol?: string; factor?: number } };
    size?: { from?: number; to?: number };
  };
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
