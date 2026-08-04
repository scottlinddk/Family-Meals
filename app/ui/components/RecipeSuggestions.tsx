import { Link } from "react-router";
import { useRecipeSuggestions, useRefreshRecipes } from "~/ui/hooks/useRecipeSuggestions";
import { Button } from "~/ui/components/ui/Button";
import { Card, CardTitle } from "~/ui/components/ui/Card";
import { Tag } from "~/ui/components/ui/Tag";
import { t } from "~/i18n/t";

/** REMA 1000's own recipes, cross-checked against this week's offers and ranked best-match-first. */
export function RecipeSuggestions() {
  const suggestions = useRecipeSuggestions();
  const refreshRecipes = useRefreshRecipes();

  return (
    <div className="mt-4">
      <h3 className="text-lg">{t("recipes.suggestionsHeading")}</h3>
      <p className="-mt-1 text-sm opacity-80">{t("recipes.suggestionsDescription")}</p>

      <Button
        type="button"
        variant="secondary"
        block
        onClick={() => refreshRecipes.mutate()}
        disabled={refreshRecipes.isPending}
      >
        {refreshRecipes.isPending ? t("recipes.refreshing") : t("recipes.refresh")}
      </Button>
      {refreshRecipes.isError && (
        <p className="mt-1 text-sm text-red-700">
          {t("recipes.refreshError")}{" "}
          {refreshRecipes.error instanceof Error ? refreshRecipes.error.message : ""}
        </p>
      )}

      {/*
        A scrape can succeed at the HTTP level and still return nothing
        usable. Reporting the ingredient yield makes that visible rather than
        leaving the suggestion list mysteriously unranked.
      */}
      {refreshRecipes.isSuccess && refreshRecipes.data && (
        <p
          className={`mt-1 text-sm ${
            refreshRecipes.data.withIngredients === 0 ? "text-red-700" : "text-muted"
          }`}
        >
          {refreshRecipes.data.withIngredients === 0
            ? t("recipes.refreshedNoIngredients", { total: refreshRecipes.data.total })
            : t("recipes.refreshedSummary", {
                total: refreshRecipes.data.total,
                withIngredients: refreshRecipes.data.withIngredients,
                withInstructions: refreshRecipes.data.withInstructions,
              })}
        </p>
      )}

      {suggestions.data && suggestions.data.length === 0 && (
        <p className="mt-3 text-sm text-muted">{t("recipes.none")}</p>
      )}

      {suggestions.data && suggestions.data.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {suggestions.data.map(({ recipe, matchedIngredients, matchedOfferNames }) => (
            <Card as="li" key={recipe.id}>
              <div className="flex items-center gap-3">
                {recipe.imageUrl && (
                  <img src={recipe.imageUrl} alt="" className="h-14 w-14 shrink-0 rounded-md object-cover" />
                )}
                <div>
                  <CardTitle>{recipe.title}</CardTitle>
                  {(recipe.servings || recipe.totalTimeMinutes) && (
                    <p className="m-0 flex gap-x-3 text-xs text-muted">
                      {recipe.servings && <span>{t("recipeDetail.servings", { count: recipe.servings })}</span>}
                      {recipe.totalTimeMinutes && (
                        <span>{t("recipeDetail.totalTime", { minutes: recipe.totalTimeMinutes })}</span>
                      )}
                    </p>
                  )}
                </div>
              </div>

              {/*
                Naming the matched ingredient next to the offer makes the
                ranking auditable — "hakket oksekød → Friland Hakket dansk
                oksekød" is checkable at a glance in a way a bare offer tag
                was not.
              */}
              {matchedIngredients.length > 0 ? (
                <ul className="m-0 flex list-none flex-col gap-1 p-0 text-sm">
                  {matchedIngredients.map(({ ingredient, offerNames }) => (
                    <li key={ingredient} className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{ingredient}</span>
                      <span className="text-xs text-muted">{offerNames.join(", ")}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  <Tag variant="neutral">
                    {recipe.ingredients.length === 0
                      ? t("recipes.noIngredientsScraped")
                      : t("recipes.noMatch")}
                  </Tag>
                </div>
              )}

              {matchedOfferNames.length > 0 && (
                <p className="m-0 text-xs text-muted">
                  {t("recipeDetail.onOfferCount", { count: matchedIngredients.length })}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                <Link to={`/recipes/${recipe.id}`} className="text-accent hover:text-accent-700">
                  {t("recipes.viewRecipe")}
                </Link>
                <a
                  href={recipe.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-muted hover:text-text"
                >
                  {t("day.viewOnRema")}
                </a>
              </div>
            </Card>
          ))}
        </ul>
      )}
    </div>
  );
}
