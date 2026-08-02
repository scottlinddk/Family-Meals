import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { RankedExternalRecipe } from "~/domain/recipes/externalRecipeMatch";

const SUGGESTIONS_QUERY_KEY = ["recipe-suggestions"] as const;

/** REMA 1000's own recipes, ranked by overlap with this week's imported offers. */
export function useRecipeSuggestions() {
  return useQuery({
    queryKey: SUGGESTIONS_QUERY_KEY,
    queryFn: async (): Promise<RankedExternalRecipe[]> => {
      const res = await fetch("/api/recipes/suggestions");
      if (!res.ok) throw new Error("Failed to load recipe suggestions");
      return res.json();
    },
  });
}

/** Re-scrapes REMA 1000's public recipe list (madogdrikke.rema1000.dk/opskrifter). */
export function useRefreshRecipes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/recipes/refresh", { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? "Failed to fetch recipes");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SUGGESTIONS_QUERY_KEY });
    },
  });
}
