import { Link, useSearchParams } from "react-router";
import { useMemo } from "react";
import { useExternalRecipes } from "~/ui/hooks/useExternalRecipes";
import { Card, CardTitle } from "~/ui/components/ui/Card";
import { FieldLabel, Input } from "~/ui/components/ui/Input";
import { Button } from "~/ui/components/ui/Button";
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
      <h1 className="mb-5 text-3xl">{t("recipesPage.title")}</h1>

      <div className="mb-4">
        <FieldLabel htmlFor="recipe-search">{t("recipesPage.searchLabel")}</FieldLabel>
        <Input
          id="recipe-search"
          type="search"
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
        <div className="mb-4 flex items-center justify-between">
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

      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {results.map((recipe) => (
          <li key={recipe.id}>
            <Link to={`/recipes/${recipe.id}`} className="block">
              <Card>
                <div className="flex items-center gap-3">
                  {recipe.imageUrl && (
                    <img
                      src={recipe.imageUrl}
                      alt=""
                      width={64}
                      height={64}
                      loading="lazy"
                      className="h-16 w-16 shrink-0 rounded-md object-cover"
                    />
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
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
