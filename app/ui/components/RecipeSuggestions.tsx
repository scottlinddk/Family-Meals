import { useMemo, useState } from "react";
import { Link } from "react-router";
import { useRecipeSuggestions, useRefreshRecipes } from "~/ui/hooks/useRecipeSuggestions";
import { useSuggestionPreferences } from "~/ui/hooks/useSuggestionPreferences";
import { useFlagOfferMismatch } from "~/ui/hooks/useIngredientOfferOverrides";
import { useAddShoppingListItem, useShoppingList } from "~/ui/hooks/useShoppingList";
import { useShoppingListMarks } from "~/ui/hooks/useShoppingListMarks";
import {
  SUGGESTION_SORTS,
  type RankedSuggestion,
  type SuggestionSort,
} from "~/domain/recipes/suggestionRanking";
import { NutritionRefresh } from "~/ui/components/NutritionRefresh";
import { findShoppingListItem, type ShoppingList } from "~/domain/planning/shoppingList";
import type { ShoppingListMarks } from "~/ui/hooks/useShoppingListMarks";
import { Button, IconButton } from "~/ui/components/ui/Button";
import { Card, CardTitle } from "~/ui/components/ui/Card";
import { Tag } from "~/ui/components/ui/Tag";
import { ThumbPhoto } from "~/ui/components/ui/Photo";
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon } from "~/ui/components/Icon";
import { SchemaOutOfDateError } from "~/lib/dbErrors";
import { mondayOf, todayIso } from "~/lib/time";
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

      {/* Nutrition is fetched separately from the recipes: the recipes come
          from a scrape and the figures from FatSecret, and the two have very
          different costs. */}
      <NutritionRefresh />

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

      {suggestions.isLoading && <p className="mt-3 text-sm text-muted">{t("week.loading")}</p>}

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
  const { recipe, matchedIngredients, matchedOfferNames, nutrition, vegetarian } = suggestion;
  const macros = nutrition?.macrosPerServing;
  const flagMismatch = useFlagOfferMismatch();

  // The recipe suggested here isn't necessarily on the week's plan — the
  // whole point of this panel is meals that aren't yet — so "already have
  // it" / "on the shopping list" is always asked against the *current* week,
  // the only week that has a shopping list to be on.
  const currentWeekStart = useMemo(() => mondayOf(todayIso()), []);
  const shoppingList = useShoppingList(currentWeekStart);
  const marks = useShoppingListMarks({ kind: "week", weekStart: currentWeekStart });
  const addToShoppingList = useAddShoppingListItem(currentWeekStart);

  // How many ingredient rows are still actually on offer — a row a family
  // flagged down to zero offers stays visible (see `MatchedIngredient`) but
  // must not keep counting as "on offer" here.
  const onOfferCount = matchedIngredients.filter((match) => match.offerNames.length > 0).length;

  return (
    <Card as="li">
      <div className="flex items-center gap-3">
        {recipe.imageUrl && <ThumbPhoto src={recipe.imageUrl} size={56} />}
        <div>
          <CardTitle>{recipe.title}</CardTitle>
          {(recipe.servings || recipe.totalTimeMinutes) && (
            <p className="m-0 flex flex-wrap gap-x-3 text-xs text-muted">
              {recipe.servings && <span>{t("recipeDetail.servings", { count: recipe.servings })}</span>}
              {recipe.totalTimeMinutes && (
                <span>{t("recipeDetail.totalTime", { minutes: recipe.totalTimeMinutes })}</span>
              )}
              {recipe.prepTimeMinutes && (
                <span>{t("recipeDetail.prepTime", { minutes: recipe.prepTimeMinutes })}</span>
              )}
              {recipe.cookTimeMinutes && (
                <span>{t("recipeDetail.cookTime", { minutes: recipe.cookTimeMinutes })}</span>
              )}
            </p>
          )}
        </div>
      </div>

      {/*
        The signals the source data doesn't carry, shown as what they are.
        A recipe whose ingredients FatSecret measured gets a plain figure and
        its protein alongside; one still resting on the ingredient-line table
        keeps the "~", because that number is an estimate and shouldn't be
        read as anything else.
      */}
      <div className="flex flex-wrap gap-1.5">
        {nutrition && (
          <Tag variant="neutral">
            {macros
              ? t("suggestions.kcalPerServingMeasured", { kcal: nutrition.perServingKcal })
              : t("suggestions.kcalPerServing", { kcal: nutrition.perServingKcal })}
          </Tag>
        )}
        {macros && (
          <Tag variant="neutral">{t("suggestions.proteinPerServing", { grams: macros.proteinG! })}</Tag>
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
          {matchedIngredients.map(({ ingredient, offerNames, weekendOnlyOfferNames }) => (
            <li key={ingredient} className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{ingredient}</span>
                {/* Flagging an offer away empties this rather than dropping the
                    row (see `MatchedIngredient`) — the ingredient is still part
                    of the recipe even once none of this week's offers are it. */}
                {offerNames.length > 0 && (
                  <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted">
                    {offerNames.map((offerName) => (
                      <span key={offerName} className="inline-flex items-center gap-0.5">
                        {offerName}
                        <button
                          type="button"
                          // p-1 rather than a bare glyph: a 12px icon is not a
                          // hit target, least of all on the phone this is used on.
                          className="-m-1 inline-flex shrink-0 p-1 text-muted hover:text-red-700 disabled:opacity-50"
                          title={t("suggestions.flagWrongMatch")}
                          aria-label={t("suggestions.flagWrongMatch")}
                          disabled={flagMismatch.isPending}
                          onClick={() =>
                            flagMismatch.mutate({ ingredientLabel: ingredient, offerName, flagged: true })
                          }
                        >
                          <CloseIcon size={12} />
                        </button>
                      </span>
                    ))}
                  </span>
                )}
                {shoppingList.data && (
                  <IngredientShoppingStatus
                    ingredient={ingredient}
                    shoppingList={shoppingList.data}
                    marks={marks}
                    onAdd={() => addToShoppingList.mutate({ label: ingredient, added: true })}
                    addPending={addToShoppingList.isPending}
                  />
                )}
              </div>
              {weekendOnlyOfferNames.length > 0 && (
                <Tag variant="accent-2">
                  {t("suggestions.weekendOnly", { offers: weekendOnlyOfferNames.join(", ") })}
                </Tag>
              )}
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
          {t("recipeDetail.onOfferCount", { count: onOfferCount })}
        </p>
      )}

      {/* A flag that didn't save has to say so — the offer reappearing on the
          next refetch is otherwise the only sign, which reads as a dead button. */}
      {flagMismatch.isError && (
        <p className="m-0 text-xs text-red-700">
          {flagMismatch.error instanceof SchemaOutOfDateError
            ? t("week.schemaOutOfDate")
            : t("suggestions.flagFailed")}
        </p>
      )}

      {addToShoppingList.isError && (
        <p className="m-0 text-xs text-red-700">
          {addToShoppingList.error instanceof SchemaOutOfDateError
            ? t("week.schemaOutOfDate")
            : t("suggestions.addToShoppingListFailed")}
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

/**
 * Whether one recipe ingredient is already spoken for: on the current week's
 * shopping list (and if so, whether it's marked as already at home), or not
 * — in which case this is where "add it" lives.
 *
 * Looked up by product identity (`findShoppingListItem`), not exact text, so
 * a recipe saying "1 løg" reads as already covered by a plan that generated
 * "2 løg, finthakket" onto the list — the same rule the list itself merges
 * ingredients with.
 */
function IngredientShoppingStatus({
  ingredient,
  shoppingList,
  marks,
  onAdd,
  addPending,
}: {
  ingredient: string;
  shoppingList: ShoppingList;
  marks: ShoppingListMarks;
  onAdd: () => void;
  addPending: boolean;
}) {
  const listItem = findShoppingListItem(shoppingList, ingredient);

  if (!listItem) {
    return (
      <button
        type="button"
        className="text-xs font-medium text-accent hover:text-accent-700 disabled:opacity-50"
        disabled={addPending}
        onClick={onAdd}
      >
        {t("suggestions.addToShoppingList")}
      </button>
    );
  }

  const atHome = marks.marks.get(listItem.label) === "at_home";
  return (
    <span className="inline-flex items-center gap-1.5">
      <Tag variant={atHome ? "neutral" : "accent"}>
        {atHome ? t("shoppingList.atHome") : t("suggestions.onShoppingList")}
      </Tag>
      <button
        type="button"
        aria-pressed={atHome}
        className="text-xs text-muted hover:text-fg"
        onClick={() => marks.toggleMark(listItem.label, "at_home")}
      >
        {atHome ? t("suggestions.unmarkAtHome") : t("shoppingList.atHome")}
      </button>
    </span>
  );
}
