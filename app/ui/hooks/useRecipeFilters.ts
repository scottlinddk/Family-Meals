import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router";
import type { RecipeFilters } from "~/domain/recipes/recipeFilters";

const PARAM_KEYS = { q: "q", proteins: "protein", tags: "tag" } as const;

function parseList(value: string | null): string[] {
  return value ? value.split(",").filter(Boolean) : [];
}

function toggleInList(current: string[], value: string): string[] {
  return current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
}

/**
 * URL-persisted filter state for the recipes page — filters live in the
 * query string (`?q=...&protein=chicken,fish&tag=oven`) so the filtered
 * view is bookmarkable/shareable and survives back/forward navigation.
 */
export function useRecipeFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters: RecipeFilters = useMemo(
    () => ({
      q: searchParams.get(PARAM_KEYS.q) ?? "",
      proteins: parseList(searchParams.get(PARAM_KEYS.proteins)),
      tags: parseList(searchParams.get(PARAM_KEYS.tags)),
    }),
    [searchParams],
  );

  const setQuery = useCallback(
    (q: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (q) next.set(PARAM_KEYS.q, q);
          else next.delete(PARAM_KEYS.q);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const toggleProtein = useCallback(
    (protein: string) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        const updated = toggleInList(parseList(next.get(PARAM_KEYS.proteins)), protein);
        if (updated.length > 0) next.set(PARAM_KEYS.proteins, updated.join(","));
        else next.delete(PARAM_KEYS.proteins);
        return next;
      });
    },
    [setSearchParams],
  );

  const toggleTag = useCallback(
    (tag: string) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        const updated = toggleInList(parseList(next.get(PARAM_KEYS.tags)), tag);
        if (updated.length > 0) next.set(PARAM_KEYS.tags, updated.join(","));
        else next.delete(PARAM_KEYS.tags);
        return next;
      });
    },
    [setSearchParams],
  );

  const clear = useCallback(() => setSearchParams(new URLSearchParams()), [setSearchParams]);

  return { filters, setQuery, toggleProtein, toggleTag, clear };
}
