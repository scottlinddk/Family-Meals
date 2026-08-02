import { useRecipeSuggestions, useRefreshRecipes } from "~/ui/hooks/useRecipeSuggestions";
import { Button } from "~/ui/components/ui/Button";
import { Card } from "~/ui/components/ui/Card";
import { t } from "~/i18n/t";

/** REMA 1000's own recipes, cross-checked against this week's offers and ranked best-match-first. */
export function RecipeSuggestions() {
  const suggestions = useRecipeSuggestions();
  const refreshRecipes = useRefreshRecipes();

  return (
    <Card as="section" className="mt-6">
      <h2 className="font-display text-2xl">{t("recipes.suggestionsHeading")}</h2>
      <p className="mt-1 text-sm text-ink-2">{t("recipes.suggestionsDescription")}</p>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-2"
        onClick={() => refreshRecipes.mutate()}
        disabled={refreshRecipes.isPending}
      >
        {refreshRecipes.isPending ? t("recipes.refreshing") : t("recipes.refresh")}
      </Button>
      {refreshRecipes.isError && (
        <p className="mt-1 text-sm text-brick">
          {t("recipes.refreshError")}{" "}
          {refreshRecipes.error instanceof Error ? refreshRecipes.error.message : ""}
        </p>
      )}

      {suggestions.data && suggestions.data.length === 0 && (
        <p className="mt-3 text-sm text-muted">{t("recipes.none")}</p>
      )}

      {suggestions.data && suggestions.data.length > 0 && (
        <ul className="mt-3 space-y-3">
          {suggestions.data.map(({ recipe, matchedOfferNames }) => (
            <li key={recipe.id} className="rounded-lg border border-line bg-surface p-3">
              <p className="font-medium text-ink">{recipe.title}</p>
              <p className="mt-1 text-sm text-ink-2">
                {matchedOfferNames.length > 0
                  ? t("recipes.onOffer", { names: matchedOfferNames.join(", ") })
                  : t("recipes.noMatch")}
              </p>
              <a
                href={recipe.url}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-block text-sm text-muted underline hover:text-ink"
              >
                {t("recipes.viewRecipe")}
              </a>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
