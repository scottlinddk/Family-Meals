import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { FamilyStoreSettings } from "~/domain/familyStoreSettings";
import { DEFAULT_FAMILY_STORE_SETTINGS } from "~/domain/familyStoreSettings";

export const FAMILY_STORE_SETTINGS_QUERY_KEY = ["family-store-settings"] as const;
const OFFERS_QUERY_KEY = ["offers"] as const;

export function useFamilyStoreSettings() {
  return useQuery({
    queryKey: FAMILY_STORE_SETTINGS_QUERY_KEY,
    queryFn: async (): Promise<FamilyStoreSettings> => {
      const res = await fetch("/api/family/store-settings");
      if (!res.ok) throw new Error("Failed to load store settings");
      return res.json();
    },
    placeholderData: DEFAULT_FAMILY_STORE_SETTINGS,
  });
}

/** Changing store selection or membership changes what the offers page shows, so both caches are invalidated together. */
export function useUpdateFamilyStoreSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (settings: FamilyStoreSettings): Promise<FamilyStoreSettings> => {
      const res = await fetch("/api/family/store-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error("Failed to save store settings");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FAMILY_STORE_SETTINGS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: OFFERS_QUERY_KEY });
    },
  });
}
