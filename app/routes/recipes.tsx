import { Link, useSearchParams } from "react-router";
import { useMemo, useState } from "react";
import { useExternalRecipes } from "~/ui/hooks/useExternalRecipes";
import { Card, CardTitle } from "~/ui/components/ui/Card";
import { SearchInput } from "~/ui/components/ui/Input";
import { ThumbPhoto } from "~/ui/components/ui/Photo";
import { Button, IconButton } from "~/ui/components/ui/Button";
import { CalorieMeta } from "~/ui/components/RecipeCalories";
import { RecipeSuggestions } from "~/ui/components/RecipeSuggestions";
import { ChevronLeftIcon, ChevronRightIcon } from "~/ui/components/Icon";
import { t } from "~/i18n/t";

/** How many of the ~350 scraped recipes a page of the list shows at once. */
const PAGE_SIZE = 20;

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

  // A page of a *different* filtered list, not a scroll position within this
  // one — so a new search starts back at the top. Reset during render (not
  // an effect) by noticing the query changed since the last render, the same
  // pattern `RecipeSuggestions` uses for its own paging, so there's no flash
  // of a stale page of results under the new search.
  const [page, setPage] = useState(0);
  const [seenQuery, setSeenQuery] = useState(q);
  if (seenQuery !== q) {
    setSeenQuery(q);
    setPage(0);
  }

  const pageCount = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const pageItems = results.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);

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
        {pageItems.map((recipe) => (
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

      {pageCount > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <IconButton
            type="button"
            aria-label={t("suggestions.prevPage")}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={currentPage === 0}
          >
            <ChevronLeftIcon size={18} />
          </IconButton>
          <span className="text-sm text-muted">
            {t("suggestions.page", { page: currentPage + 1, pages: pageCount })}
          </span>
          <IconButton
            type="button"
            aria-label={t("suggestions.nextPage")}
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            disabled={currentPage === pageCount - 1}
          >
            <ChevronRightIcon size={18} />
          </IconButton>
        </div>
      )}
    </>
  );
}
