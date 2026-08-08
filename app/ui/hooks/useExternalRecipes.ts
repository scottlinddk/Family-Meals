import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ExternalRecipe } from "~/domain/types";

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
    queryFn: async (): Promise<ExternalRecipe | null> => {
      const res = await fetch(`/api/recipes/${id}`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to load recipe");
      return res.json();
    },
  });
}

/** Imports one recipe by fetching a user-pasted URL server-side. */
export function useImportRecipeFromUrl() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (url: string): Promise<ExternalRecipe> => {
      const res = await fetch("/api/recipes/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message ?? "Failed to import recipe");
      return body.recipe;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["external-recipes"] });
    },
  });
}

/** Deletes a URL-imported recipe by id. Refused server-side for REMA's own scraped catalog. */
export function useDeleteRecipe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const res = await fetch(`/api/recipes/${encodeURIComponent(id)}`, { method: "DELETE" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message ?? "Failed to delete recipe");
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["external-recipes"] });
      queryClient.removeQueries({ queryKey: ["external-recipes", id] });
    },
  });
}
