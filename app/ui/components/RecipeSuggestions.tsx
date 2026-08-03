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

      {suggestions.data && suggestions.data.length === 0 && (
        <p className="mt-3 text-sm text-muted">{t("recipes.none")}</p>
      )}

      {suggestions.data && suggestions.data.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {suggestions.data.map(({ recipe, matchedOfferNames }) => (
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
              <div className="flex flex-wrap gap-1.5">
                {matchedOfferNames.length > 0 ? (
                  matchedOfferNames.map((name) => (
                    <Tag key={name} variant="accent">
                      {name}
                    </Tag>
                  ))
                ) : (
                  <Tag variant="neutral">{t("recipes.noMatch")}</Tag>
                )}
              </div>
              <a
                href={recipe.url}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-muted underline hover:text-text"
              >
                {t("recipes.viewRecipe")}
              </a>
            </Card>
          ))}
        </ul>
      )}
    </div>
  );
}
