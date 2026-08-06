import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router";
import { isSuggestionSort, type SuggestionSort } from "~/domain/recipes/suggestionRanking";
import type { SuggestionPreferences } from "~/ui/hooks/useRecipeSuggestions";

const SORT_PARAM = "sort";
const VEGETARIAN_PARAM = "vegetar";

/**
 * How the suggestion panel is currently ranked, kept in the query string
 * (`?sort=calories&vegetar=1`) rather than in component state.
 *
 * Same reason as the recipes page's filters: "the light meat-free ones" is a
 * view worth bookmarking, sending to the person who does the cooking, and
 * getting back after a reload — none of which local state survives.
 */
export function useSuggestionPreferences() {
  const [searchParams, setSearchParams] = useSearchParams();

  const preferences: SuggestionPreferences = useMemo(() => {
    const sort = searchParams.get(SORT_PARAM);
    return {
      sort: isSuggestionSort(sort) ? sort : "balanced",
      vegetarianOnly: searchParams.get(VEGETARIAN_PARAM) === "1",
    };
  }, [searchParams]);

  const setSort = useCallback(
    (sort: SuggestionSort) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          // The default doesn't need saying, so it stays out of the URL.
          if (sort === "balanced") next.delete(SORT_PARAM);
          else next.set(SORT_PARAM, sort);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const toggleVegetarianOnly = useCallback(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (next.get(VEGETARIAN_PARAM) === "1") next.delete(VEGETARIAN_PARAM);
        else next.set(VEGETARIAN_PARAM, "1");
        return next;
      },
      { replace: true },
    );
  }, [setSearchParams]);

  return { preferences, setSort, toggleVegetarianOnly };
}
