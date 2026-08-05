import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DEFAULT_USER_PREFERENCES,
  type CookViewMode,
  type UserPreferences,
} from "~/domain/preferences";

const PREFERENCES_QUERY_KEY = ["user-preferences"] as const;

/**
 * The signed-in user's view preferences, shared by every page that has one.
 * They change roughly never, so they're kept fresh for the session rather
 * than refetched on each mount — the mutation below writes the answer
 * straight into the cache anyway.
 */
export function useUserPreferences() {
  return useQuery({
    queryKey: PREFERENCES_QUERY_KEY,
    queryFn: async (): Promise<UserPreferences> => {
      const res = await fetch("/api/preferences");
      if (!res.ok) throw new Error("Failed to load preferences");
      return res.json();
    },
    staleTime: Infinity,
  });
}

/**
 * Switches how cook mode lays out a recipe, for this user everywhere.
 *
 * Applied to the cache before the request goes out: flipping the layout is a
 * direct manipulation of what's on screen, and waiting a round trip to see it
 * — on a phone, in a kitchen, possibly on a bad connection — would feel
 * broken. A failed save rolls the cache back so the toggle can't end up
 * claiming a preference the database never took.
 */
export function useSetCookViewMode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cookViewMode: CookViewMode): Promise<UserPreferences> => {
      const res = await fetch("/api/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cookViewMode }),
      });
      if (!res.ok) throw new Error("Failed to save preferences");
      return res.json();
    },

    onMutate: async (cookViewMode) => {
      await queryClient.cancelQueries({ queryKey: PREFERENCES_QUERY_KEY });
      const previous = queryClient.getQueryData<UserPreferences>(PREFERENCES_QUERY_KEY);
      queryClient.setQueryData<UserPreferences>(PREFERENCES_QUERY_KEY, {
        ...(previous ?? DEFAULT_USER_PREFERENCES),
        cookViewMode,
      });
      return { previous };
    },

    onError: (_error, _mode, context) => {
      // Nothing to roll back to when the query hadn't loaded yet, so ask the
      // server rather than leaving the optimistic value standing.
      if (context?.previous) queryClient.setQueryData(PREFERENCES_QUERY_KEY, context.previous);
      else queryClient.invalidateQueries({ queryKey: PREFERENCES_QUERY_KEY });
    },

    onSuccess: (saved) => {
      queryClient.setQueryData(PREFERENCES_QUERY_KEY, saved);
    },
  });
}
