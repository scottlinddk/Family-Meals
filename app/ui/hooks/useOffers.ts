import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Offer, StoreId } from "~/domain/types";
import type { OfferInput } from "~/adapters/offerSource/offerSchema";

const OFFERS_QUERY_KEY = ["offers"] as const;

export interface OfferSnapshotSummary {
  id: string;
  storeId: StoreId;
  source: "manual" | "etilbudsavis";
  offerCount: number;
  validFrom: string | null;
  validUntil: string | null;
  importedAt: string;
}

export interface StoreOffers {
  /** This store's latest import, or null if the family has never imported it. */
  snapshot: OfferSnapshotSummary | null;
  /** Offers from that import that are on offer right now. */
  offers: Offer[];
  /** Offers from that import that haven't started yet — this store's next catalog. */
  upcomingOffers: Offer[];
  /** How many offers the import contained in total, valid or not. */
  importedCount: number;
}

export interface OffersResponse {
  /** Keyed by store id — only the family's selected stores are present. */
  stores: Partial<Record<StoreId, StoreOffers>>;
  selectedStores: StoreId[];
}

export function useOffers() {
  return useQuery({
    queryKey: OFFERS_QUERY_KEY,
    queryFn: async (): Promise<OffersResponse> => {
      const res = await fetch("/api/offers");
      if (!res.ok) throw new Error("Failed to load offers");
      return res.json();
    },
  });
}

export function useImportOffers() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (offers: OfferInput[]) => {
      const res = await fetch("/api/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(offers),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to import offers");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: OFFERS_QUERY_KEY });
    },
  });
}

export interface RefreshOffersResult {
  ok: boolean;
  refreshed: { storeId: StoreId; count: number }[];
  failed: { storeId: StoreId; message: string }[];
  storeNames: Record<StoreId, string>;
}

/** Fetches the family's selected stores' current offers automatically from etilbudsavis.dk. */
export function useRefreshOffers() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<RefreshOffersResult> => {
      const res = await fetch("/api/offers/refresh", { method: "POST" });
      const body = await res.json().catch(() => ({}));
      // A partial-success response (some stores refreshed, some failed) is
      // still useful data, not a failed mutation — only a total failure
      // (nothing at all refreshed) should reject.
      if (!res.ok && (!body.refreshed || body.refreshed.length === 0)) {
        throw new Error(body.message ?? "Failed to fetch offers");
      }
      return body;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: OFFERS_QUERY_KEY });
    },
  });
}
