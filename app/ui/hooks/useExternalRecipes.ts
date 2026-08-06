import { useQuery } from "@tanstack/react-query";
import type { ExternalRecipe } from "~/domain/types";
import type { RecipeNutrition } from "~/domain/nutrition/recipeNutrition";

/** A recipe with what it puts on a plate — see `api.recipes.$id.tsx`. */
export interface ExternalRecipeWithNutrition extends ExternalRecipe {
  /** Null when the recipe has no ingredient list to compute from. */
  nutrition: RecipeNutrition | null;
}

/** All of REMA 1000's own cached recipes, unranked. */
export function useExternalRecipes() {
  return useQuery({
    queryKey: ["external-recipes"],
    queryFn: async (): Promise<ExternalRecipe[]> => {
      const res = await fetch("/api/recipes");
      if (!res.ok) throw new Error("Failed to load recipes");
      return res.json();
    },
  });
}

/** A single REMA 1000 recipe by id. */
export function useExternalRecipe(id: string) {
  return useQuery({
    queryKey: ["external-recipes", id],
    queryFn: async (): Promise<ExternalRecipeWithNutrition | null> => {
      const res = await fetch(`/api/recipes/${id}`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to load recipe");
      return res.json();
    },
  });
}
