import { Link, useSearchParams } from "react-router";
import { useMemo } from "react";
import { useExternalRecipes } from "~/ui/hooks/useExternalRecipes";
import { Card, CardTitle } from "~/ui/components/ui/Card";
import { SearchInput } from "~/ui/components/ui/Input";
import { ThumbPhoto } from "~/ui/components/ui/Photo";
import { Button } from "~/ui/components/ui/Button";
import { CalorieMeta } from "~/ui/components/RecipeCalories";
import { RecipeSuggestions } from "~/ui/components/RecipeSuggestions";
import { ChevronRightIcon } from "~/ui/components/Icon";
import { t } from "~/i18n/t";

export default function RecipesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const recipes = useExternalRecipes();

  const results = useMemo(() => {
    if (!recipes.data) return [];
    if (!q) return recipes.data;
    const needle = q.toLowerCase();
    return recipes.data.filter(
      (recipe) =>
        recipe.title.toLowerCase().includes(needle) ||
        recipe.ingredients.some((ingredient) => ingredient.toLowerCase().includes(needle)),
    );
  }, [recipes.data, q]);

  return (
    <>
      <h1 className="mb-4 text-2xl">{t("recipesPage.heading")}</h1>

      <RecipeSuggestions />

      <h2 className="mt-8 mb-4 text-lg">{t("recipesPage.title")}</h2>

      <div className="mb-4">
        <SearchInput
          id="recipe-search"
          type="search"
          aria-label={t("recipesPage.searchLabel")}
          value={q}
          onChange={(e) => {
            const value = e.target.value;
            setSearchParams(
              (prev) => {
                const next = new URLSearchParams(prev);
                if (value) next.set("q", value);
                else next.delete("q");
                return next;
              },
              { replace: true },
            );
          }}
          placeholder={t("recipesPage.searchPlaceholder")}
        />
      </div>

      {recipes.isLoading && <p className="text-sm text-muted">{t("week.loading")}</p>}

      {recipes.data && (
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="m-0 text-sm text-muted">{t("recipesPage.resultCount", { count: results.length })}</p>
          {q && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setSearchParams({})}>
              {t("recipesPage.clearFilters")}
            </Button>
          )}
        </div>
      )}

      {recipes.data && recipes.data.length === 0 && <p className="text-sm text-muted">{t("recipes.none")}</p>}
      {recipes.data && recipes.data.length > 0 && results.length === 0 && (
        <p className="text-sm text-muted">{t("recipesPage.none")}</p>
      )}

      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {results.map((recipe) => (
          <li key={recipe.id}>
            <Link to={`/recipes/${recipe.id}`} className="block">
              <Card interactive>
                <div className="flex items-center gap-3">
                  {recipe.imageUrl && <ThumbPhoto src={recipe.imageUrl} size={86} />}
                  <div className="min-w-0 flex-1">
                    <CardTitle>{recipe.title}</CardTitle>
                    <p className="m-0 mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted">
                      {recipe.servings && <span>{t("recipeDetail.servings", { count: recipe.servings })}</span>}
                      {recipe.totalTimeMinutes && (
                        <span>{t("recipeDetail.totalTime", { minutes: recipe.totalTimeMinutes })}</span>
                      )}
                      <CalorieMeta ingredientLines={recipe.ingredients} servings={recipe.servings} />
                    </p>
                  </div>
                  <ChevronRightIcon size={18} className="shrink-0 text-muted-2" />
                </div>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
