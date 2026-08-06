import { useState } from "react";
import { Link } from "react-router";
import { useRecipeSuggestions, useRefreshRecipes } from "~/ui/hooks/useRecipeSuggestions";
import { useSuggestionPreferences } from "~/ui/hooks/useSuggestionPreferences";
import {
  SUGGESTION_SORTS,
  type RankedSuggestion,
  type SuggestionSort,
} from "~/domain/recipes/suggestionRanking";
import { Button, IconButton } from "~/ui/components/ui/Button";
import { Card, CardTitle } from "~/ui/components/ui/Card";
import { Tag } from "~/ui/components/ui/Tag";
import { ThumbPhoto } from "~/ui/components/ui/Photo";
import { ChevronLeftIcon, ChevronRightIcon } from "~/ui/components/Icon";
import { t, type TranslationKey } from "~/i18n/t";

/** How many suggestions a page of the panel shows at once. */
const PAGE_SIZE = 6;

const SORT_LABEL_KEYS: Record<SuggestionSort, TranslationKey> = {
  balanced: "suggestions.sort.balanced",
  offers: "suggestions.sort.offers",
  calories: "suggestions.sort.calories",
};

const SORT_EXPLANATION_KEYS: Record<SuggestionSort, TranslationKey> = {
  balanced: "suggestions.explain.balanced",
  offers: "suggestions.explain.offers",
  calories: "suggestions.explain.calories",
};

/**
 * "Best meals this week" — REMA's own recipes, ranked on the three things
 * that actually decide dinner: what's on offer, what's light, and what's
 * meat-free (see `suggestionRanking.ts`).
 *
 * One control rather than three lists. Which signal should lead changes from
 * week to week — a week with cheap mince ranks differently from a week
 * someone wants to eat lighter — and the balanced default is what the panel
 * opens with, because most weeks the answer is a bit of each.
 */
export function RecipeSuggestions() {
  const { preferences, setSort, toggleVegetarianOnly } = useSuggestionPreferences();
  const suggestions = useRecipeSuggestions(preferences);
  const refreshRecipes = useRefreshRecipes();

  // A page of a *different* ranked list, not a scroll position within this
  // one — so switching sort or the vegetarian filter starts back at the top.
  // Reset during render (rather than an effect) by noticing the preferences
  // changed since the last render, so there's no flash of the old page.
  const [page, setPage] = useState(0);
  const [seenPreferences, setSeenPreferences] = useState(preferences);
  if (seenPreferences.sort !== preferences.sort || seenPreferences.vegetarianOnly !== preferences.vegetarianOnly) {
    setSeenPreferences(preferences);
    setPage(0);
  }

  const pageCount = suggestions.data ? Math.max(1, Math.ceil(suggestions.data.length / PAGE_SIZE)) : 1;
  const currentPage = Math.min(page, pageCount - 1);
  const pageItems = suggestions.data?.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE) ?? [];

  return (
    <div className="mt-6">
      <h2 className="text-lg">{t("recipes.suggestionsHeading")}</h2>
      <p className="mt-1 mb-3 text-sm text-muted">{t("recipes.suggestionsDescription")}</p>

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

      {/*
        Coverage, per theme: the listing states how many recipes the theme
        holds, so "350 of 350" is checkable — and a crawl that stopped early
        (a skipped page, or the detail-page fallback with its own cap) reads
        as short rather than as a fresh full cache.
      */}
      {refreshRecipes.isSuccess &&
        refreshRecipes.data?.themes?.map((theme) => (
          <p key={theme.theme} className="mt-1 text-sm text-muted">
            {t("recipes.refreshedCoverage", {
              theme: theme.theme,
              recipes: theme.recipes,
              total: theme.reportedTotal ?? theme.recipes,
              pages: theme.pagesFetched,
            })}
            {theme.failedPages.length + theme.unexpectedPages.length > 0 &&
              ` ${t("recipes.refreshedPagesSkipped", {
                pages: [...theme.failedPages, ...theme.unexpectedPages].sort((a, b) => a - b).join(", "),
              })}`}
          </p>
        ))}

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <div role="group" aria-label={t("suggestions.sortLabel")} className="flex flex-wrap gap-1">
          {SUGGESTION_SORTS.map((sort) => (
            <Button
              key={sort}
              type="button"
              size="sm"
              variant={sort === preferences.sort ? "primary" : "secondary"}
              aria-pressed={sort === preferences.sort}
              onClick={() => sort !== preferences.sort && setSort(sort)}
            >
              {t(SORT_LABEL_KEYS[sort])}
            </Button>
          ))}
        </div>
        {/* A filter, not a fourth sort: when meat-free is asked for, it's a
            requirement, and a list that merely demotes meat still serves it. */}
        <Button
          type="button"
          size="sm"
          variant={preferences.vegetarianOnly ? "primary" : "secondary"}
          aria-pressed={preferences.vegetarianOnly}
          onClick={toggleVegetarianOnly}
        >
          {t("suggestions.vegetarianOnly")}
        </Button>
      </div>
      <p className="mt-1.5 mb-0 text-xs text-muted">{t(SORT_EXPLANATION_KEYS[preferences.sort])}</p>

      {suggestions.isError && <p className="mt-3 text-sm text-red-700">{t("suggestions.loadFailed")}</p>}

      {suggestions.data && suggestions.data.length === 0 && (
        <p className="mt-3 text-sm text-muted">
          {preferences.vegetarianOnly ? t("suggestions.noneVegetarian") : t("recipes.none")}
        </p>
      )}

      {suggestions.data && suggestions.data.length > 0 && (
        <>
          <ul className="m-0 mt-3 flex list-none flex-col gap-3 p-0">
            {pageItems.map((suggestion) => (
              <SuggestionCard key={suggestion.recipe.id} suggestion={suggestion} />
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
      )}
    </div>
  );
}

function SuggestionCard({ suggestion }: { suggestion: RankedSuggestion }) {
  const { recipe, matchedIngredients, matchedOfferNames, calories, vegetarian } = suggestion;

  return (
    <Card as="li">
      <div className="flex items-center gap-3">
        {recipe.imageUrl && <ThumbPhoto src={recipe.imageUrl} size={56} />}
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
        The two signals the source data doesn't carry, shown as what they are:
        the calorie figure is computed from the ingredient lines, so it's
        written with a "~" rather than as something to count on to the calorie.
      */}
      <div className="flex flex-wrap gap-1.5">
        {calories && (
          <Tag variant="neutral">{t("recipeDetail.kcalPerServing", { kcal: calories.perServingKcal })}</Tag>
        )}
        {vegetarian.vegetarian && <Tag variant="accent-2">{t("suggestions.vegetarian")}</Tag>}
      </div>

      {/*
        Naming the matched ingredient next to the offer makes the ranking
        auditable — "hakket oksekød → Friland Hakket dansk oksekød" is
        checkable at a glance in a way a bare offer tag was not.
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
            {recipe.ingredients.length === 0 ? t("recipes.noIngredientsScraped") : t("recipes.noMatch")}
          </Tag>
        </div>
      )}

      {matchedOfferNames.length > 0 && (
        <p className="m-0 text-xs text-muted">
          {t("recipeDetail.onOfferCount", { count: matchedIngredients.length })}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] font-semibold">
        <Link
          to={`/recipes/${recipe.id}`}
          className="inline-flex items-center gap-1 text-accent hover:text-accent-700"
        >
          {t("recipes.viewRecipe")}
          <ChevronRightIcon size={14} />
        </Link>
        <a href={recipe.url} target="_blank" rel="noreferrer" className="text-muted hover:text-text">
          {t("day.viewOnRema")}
        </a>
      </div>
    </Card>
  );
}
