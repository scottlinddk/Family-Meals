import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

/** How much of the recipe cache's ingredient vocabulary has nutrition data. */
export interface NutritionCoverage {
  /** Whether FatSecret credentials are configured on the server at all. */
  configured: boolean;
  /** Distinct ingredient terms across every cached recipe. */
  terms: number;
  /** Terms FatSecret answered for. */
  matched: number;
  /** Terms FatSecret had nothing usable for — cached so they aren't re-asked. */
  unmatched: number;
  /** Terms nobody has looked up yet. */
  missing: number;
}

export interface RefreshNutritionResult {
  ok: true;
  terms: number;
  lookedUp: number;
  matched: number;
  unmatched: number;
  remaining: number;
  failures: { term: string; message: string }[];
  failureCount: number;
}

const NUTRITION_QUERY_KEY = ["nutrition"] as const;

export function useNutritionCoverage() {
  return useQuery({
    queryKey: NUTRITION_QUERY_KEY,
    queryFn: async (): Promise<NutritionCoverage> => {
      const res = await fetch("/api/nutrition");
      if (!res.ok) throw new Error("Failed to load nutrition coverage");
      return res.json();
    },
  });
}

/**
 * Fetches nutrition for the ingredient terms that don't have any yet.
 *
 * One press does a bounded batch rather than the whole vocabulary — see
 * `api.nutrition.tsx` — so the button is meant to be pressed until
 * `remaining` reaches zero, and the caller shows what's left.
 */
export function useRefreshNutrition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<RefreshNutritionResult> => {
      const res = await fetch("/api/nutrition", { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? "Failed to fetch nutrition data");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NUTRITION_QUERY_KEY });
      // Both of these show figures derived from the cache that just changed.
      queryClient.invalidateQueries({ queryKey: ["recipe-suggestions"] });
      queryClient.invalidateQueries({ queryKey: ["external-recipes"] });
    },
  });
}
