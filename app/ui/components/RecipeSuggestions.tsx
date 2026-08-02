import { useRecipeSuggestions, useRefreshRecipes } from "~/ui/hooks/useRecipeSuggestions";
import { t } from "~/i18n/t";

/** REMA 1000's own recipes, cross-checked against this week's offers and ranked best-match-first. */
export function RecipeSuggestions() {
  const suggestions = useRecipeSuggestions();
  const refreshRecipes = useRefreshRecipes();

  return (
    <section className="mt-6 rounded-lg border border-gray-200 p-4">
      <h2 className="text-lg font-semibold">{t("recipes.suggestionsHeading")}</h2>
      <p className="mt-1 text-sm text-gray-600">{t("recipes.suggestionsDescription")}</p>

      <button
        type="button"
        onClick={() => refreshRecipes.mutate()}
        disabled={refreshRecipes.isPending}
        className="mt-2 rounded border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50"
      >
        {refreshRecipes.isPending ? t("recipes.refreshing") : t("recipes.refresh")}
      </button>
      {refreshRecipes.isError && (
        <p className="mt-1 text-sm text-red-700">
          {t("recipes.refreshError")}{" "}
          {refreshRecipes.error instanceof Error ? refreshRecipes.error.message : ""}
        </p>
      )}

      {suggestions.data && suggestions.data.length === 0 && (
        <p className="mt-3 text-sm text-gray-500">{t("recipes.none")}</p>
      )}

      {suggestions.data && suggestions.data.length > 0 && (
        <ul className="mt-3 space-y-3">
          {suggestions.data.map(({ recipe, matchedOfferNames }) => (
            <li key={recipe.id} className="rounded border border-gray-200 p-3">
              <p className="font-medium">{recipe.title}</p>
              <p className="mt-1 text-sm text-gray-600">
                {matchedOfferNames.length > 0
                  ? t("recipes.onOffer", { names: matchedOfferNames.join(", ") })
                  : t("recipes.noMatch")}
              </p>
              <a
                href={recipe.url}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-block text-sm text-gray-500 underline"
              >
                {t("recipes.viewRecipe")}
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
