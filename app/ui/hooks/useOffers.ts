import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Offer } from "~/domain/types";
import type { OfferInput } from "~/adapters/offerSource/offerSchema";

const OFFERS_QUERY_KEY = ["offers"] as const;

export function useOffers() {
  return useQuery({
    queryKey: OFFERS_QUERY_KEY,
    queryFn: async (): Promise<Offer[]> => {
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

/** Fetches this week's REMA 1000 offers automatically from etilbudsavis.dk. */
export function useRefreshOffers() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/offers/refresh", { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? "Failed to fetch offers");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: OFFERS_QUERY_KEY });
    },
  });
}
