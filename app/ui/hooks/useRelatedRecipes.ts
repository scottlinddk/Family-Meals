import { useQuery } from "@tanstack/react-query";
import type { RankedRelatedRecipe } from "~/domain/recipes/relatedExternalRecipes";

/** REMA 1000's own recipes whose ingredients overlap with a curated recipe. */
export function useRelatedRecipes(recipeId: string) {
  return useQuery({
    queryKey: ["related-recipes", recipeId],
    queryFn: async (): Promise<RankedRelatedRecipe[]> => {
      const res = await fetch(`/api/recipes/${recipeId}/related`);
      if (!res.ok) throw new Error("Failed to load related recipes");
      return res.json();
    },
  });
}
