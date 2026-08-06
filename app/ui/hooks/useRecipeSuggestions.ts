import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { RankedSuggestion, SuggestionSort } from "~/domain/recipes/suggestionRanking";

const SUGGESTIONS_QUERY_KEY = ["recipe-suggestions"] as const;

export interface SuggestionPreferences {
  sort: SuggestionSort;
  vegetarianOnly: boolean;
}

/**
 * REMA 1000's own recipes, ranked for this week — by offer overlap, by
 * calories per serving, or the balance of both plus meat-free (see
 * `suggestionRanking.ts`).
 *
 * The preferences are part of the query key rather than something the
 * component sorts after the fact, so switching back to a mode already looked
 * at is instant from cache while a new one is a single request. Ranking 350
 * recipes belongs on the server either way — the browser never needs the
 * whole cache to see the best two dozen.
 */
export function useRecipeSuggestions({ sort, vegetarianOnly }: SuggestionPreferences) {
  return useQuery({
    queryKey: [...SUGGESTIONS_QUERY_KEY, sort, vegetarianOnly] as const,
    queryFn: async (): Promise<RankedSuggestion[]> => {
      const params = new URLSearchParams({ sort });
      if (vegetarianOnly) params.set("vegetarian", "1");
      const res = await fetch(`/api/recipes/suggestions?${params}`);
      if (!res.ok) throw new Error("Failed to load recipe suggestions");
      return res.json();
    },
  });
}

/** Extraction health returned by the refresh endpoint, surfaced to the user. */
export interface RefreshRecipesResult {
  ok: true;
  count: number;
  total: number;
  withIngredients: number;
  withInstructions: number;
  /** Per-theme crawl coverage — see `CrawlStats` in `RemaRecipeSource`. */
  themes?: {
    theme: string;
    strategy: "listing-payload" | "detail-pages";
    reportedTotal?: number;
    pagesFetched: number;
    recipes: number;
    unexpectedPages: number[];
    failedPages: number[];
  }[];
}

/** Re-scrapes REMA 1000's public recipe list (madogdrikke.rema1000.dk/opskrifter). */
export function useRefreshRecipes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<RefreshRecipesResult> => {
      const res = await fetch("/api/recipes/refresh", { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? "Failed to fetch recipes");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SUGGESTIONS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["external-recipes"] });
    },
  });
}
