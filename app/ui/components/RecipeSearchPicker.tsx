import { useId, useMemo, useState, type KeyboardEvent } from "react";
import type { ExternalRecipe } from "~/domain/types";
import { SearchInput } from "~/ui/components/ui/Input";
import { t } from "~/i18n/t";

/** How many matches to show at once — a search result, not a full list dump. */
const MAX_SUGGESTIONS = 8;

function matchesQuery(recipe: ExternalRecipe, needle: string): boolean {
  return (
    recipe.title.toLowerCase().includes(needle) ||
    recipe.ingredients.some((ingredient) => ingredient.toLowerCase().includes(needle))
  );
}

/**
 * A search box with a dropdown of matching recipes, for picking one out of
 * the ~350 scraped ones without scrolling a several-hundred-option
 * `<select>`. Filters on title or ingredient substring — the same rule
 * `recipes.tsx`'s own search uses — so a search for an ingredient finds
 * recipes that call for it, not just ones named after it.
 *
 * Deliberately not a form field with a persisted value: picking a recipe is
 * an action (swap to this one), not a value the field should keep showing
 * afterwards, so selecting clears the search back to empty.
 */
export function RecipeSearchPicker({
  id,
  recipes,
  placeholder,
  onSelect,
  disabled,
}: {
  id: string;
  recipes: ExternalRecipe[];
  placeholder: string;
  onSelect: (recipe: ExternalRecipe) => void;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const listboxId = useId();

  const suggestions = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matches = needle ? recipes.filter((recipe) => matchesQuery(recipe, needle)) : recipes;
    return matches.slice(0, MAX_SUGGESTIONS);
  }, [recipes, query]);

  function select(recipe: ExternalRecipe) {
    onSelect(recipe);
    setQuery("");
    setOpen(false);
    setHighlighted(0);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!open) {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") setOpen(true);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlighted((h) => Math.min(h + 1, suggestions.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const recipe = suggestions[highlighted];
      if (recipe) select(recipe);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      <SearchInput
        id={id}
        type="search"
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-autocomplete="list"
        autoComplete="off"
        value={query}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
          setHighlighted(0);
        }}
        onFocus={() => setOpen(true)}
        // A short delay so a click on an option (which blurs the input first)
        // still registers before the list this closes disappears.
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        onKeyDown={onKeyDown}
      />

      {open && suggestions.length > 0 && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-divider bg-surface py-1 shadow-lg"
        >
          {suggestions.map((recipe, index) => (
            <li key={recipe.id} role="option" aria-selected={index === highlighted}>
              <button
                type="button"
                className={`block w-full truncate px-3 py-2 text-left text-sm text-text ${
                  index === highlighted ? "bg-neutral-100" : ""
                }`}
                // Keeps focus on the input so `onBlur` above doesn't fire
                // before the click is registered.
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => select(recipe)}
                onMouseEnter={() => setHighlighted(index)}
              >
                {recipe.title}
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && query && suggestions.length === 0 && (
        <p className="absolute z-10 mt-1 w-full rounded-md border border-divider bg-surface px-3 py-2 text-sm text-muted shadow-lg">
          {t("day.noRecipesFound")}
        </p>
      )}
    </div>
  );
}
