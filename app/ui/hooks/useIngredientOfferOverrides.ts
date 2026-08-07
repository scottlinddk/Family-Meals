import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { RankedSuggestion } from "~/domain/recipes/suggestionRanking";
import { offerOverrideKey } from "~/domain/recipes/externalRecipeMatch";
import { SCHEMA_OUT_OF_DATE_STATUS, SchemaOutOfDateError } from "~/lib/dbErrors";

const SUGGESTIONS_QUERY_KEY = ["recipe-suggestions"] as const;

export interface OfferMismatch {
  ingredientLabel: string;
  offerName: string;
}

/**
 * Drops a flagged pairing from an already-loaded suggestion list.
 *
 * Applied to the cache so the offer disappears on the click rather than a
 * round trip later, and keyed the same way the server excludes it — by
 * product identity — so it also vanishes from the other recipes naming the
 * same ingredient, which is what the refetch will come back with.
 */
function withoutPair(suggestions: RankedSuggestion[], flagged: OfferMismatch): RankedSuggestion[] {
  const flaggedKey = offerOverrideKey(flagged.ingredientLabel, flagged.offerName);

  return suggestions.map((suggestion) => {
    const matchedIngredients = suggestion.matchedIngredients
      .map((match) => ({
        ...match,
        offerNames: match.offerNames.filter(
          (offerName) => offerOverrideKey(match.ingredient, offerName) !== flaggedKey,
        ),
      }))
      .filter((match) => match.offerNames.length > 0);

    const kept = new Set(matchedIngredients.flatMap((match) => match.offerNames));
    return {
      ...suggestion,
      matchedIngredients,
      matchedOfferNames: suggestion.matchedOfferNames.filter((name) => kept.has(name)),
      offerScore: matchedIngredients.length,
    };
  });
}

/**
 * Flags (or un-flags) an ingredient↔offer pairing as a wrong match — see
 * `ingredientOfferOverrides` in the schema.
 *
 * Not offline-tolerant like the shopping-list marks: flagging a bad match
 * isn't a time-pressured in-shop action, so an optimistic cache edit plus a
 * refetch is enough. The refetch matters because excluding an offer changes
 * what the ranking scores, so the list can legitimately reorder afterwards.
 */
export function useFlagOfferMismatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ flagged, ...pair }: OfferMismatch & { flagged: boolean }) => {
      const res = await fetch("/api/recipes/ingredient-offer-overrides", {
        method: flagged ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pair),
      });
      if (res.status === SCHEMA_OUT_OF_DATE_STATUS) throw new SchemaOutOfDateError();
      if (!res.ok) throw new Error("Failed to update the offer match flag");
    },
    onMutate: ({ flagged, ...pair }) => {
      if (!flagged) return;
      queryClient.setQueriesData<RankedSuggestion[]>(
        { queryKey: SUGGESTIONS_QUERY_KEY },
        (suggestions) => (suggestions ? withoutPair(suggestions, pair) : suggestions),
      );
    },
    // Settled rather than success: a failed flag has to put back the offer the
    // optimistic edit already removed, or the card lies about what it did.
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: SUGGESTIONS_QUERY_KEY });
    },
  });
}
