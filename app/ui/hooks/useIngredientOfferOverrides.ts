import { useMutation, useQueryClient } from "@tanstack/react-query";

const SUGGESTIONS_QUERY_KEY = ["recipe-suggestions"] as const;

/**
 * Flags (or un-flags) an ingredient↔offer pairing as a wrong match — see
 * `ingredientOfferOverrides` in the schema. Not offline-tolerant like the
 * shopping-list marks: flagging a bad match isn't a time-pressured in-shop
 * action, so a plain mutation that refetches the suggestion list on success
 * is enough.
 */
export function useFlagOfferMismatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      ingredientLabel,
      offerName,
      flagged,
    }: {
      ingredientLabel: string;
      offerName: string;
      /** True to flag the pairing as wrong, false to undo an earlier flag. */
      flagged: boolean;
    }) => {
      const res = await fetch("/api/recipes/ingredient-offer-overrides", {
        method: flagged ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredientLabel, offerName }),
      });
      if (!res.ok) throw new Error("Failed to update the offer match flag");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SUGGESTIONS_QUERY_KEY });
    },
  });
}
