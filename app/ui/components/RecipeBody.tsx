import { Accordion } from "~/ui/components/ui/Accordion";
import { Tag } from "~/ui/components/ui/Tag";
import { CalorieMeta } from "~/ui/components/RecipeCalories";
import { offerPricesMatchingIngredient, type IngredientOfferPrice } from "~/domain/recipes/ingredientOfferScore";
import { STORE_NAMES } from "~/domain/stores";
import type { Offer } from "~/domain/types";
import { t } from "~/i18n/t";

export interface RecipeBodyProps {
  ingredientLines: string[];
  instructionLines: string[];
  /**
   * Where this recipe came from (`ExternalRecipe.source`) — shown as a short
   * attribution line for anything other than the curated `"rema1000"` scrape,
   * so a URL-imported recipe is visibly not part of the app's own catalog.
   */
  source?: string;
  /** Ingredient lines that are on offer, highlighted in the list. */
  offerIngredientLines?: string[];
  /**
   * This week's offers, for a per-ingredient price badge. Independent of
   * `offerIngredientLines` (a precomputed snapshot some callers pass instead)
   * — when both are given, a line can be highlighted by one and priced by
   * the other.
   */
  offers?: Offer[];
  servings?: number;
  totalTimeMinutes?: number;
  /** Active prep time, shown alongside cook time when the source states them separately. */
  prepTimeMinutes?: number;
  /** Cook time, shown alongside prep time when the source states them separately. */
  cookTimeMinutes?: number;
  description?: string;
  /** Original source page. Always rendered when present — never the only way in. */
  url?: string;
}

/** The cheapest of an ingredient's per-store prices, for the at-a-glance badge. */
function cheapest(prices: IngredientOfferPrice[]): IngredientOfferPrice {
  return prices.reduce((min, p) => (p.price < min.price ? p : min), prices[0]!);
}

/**
 * The full recipe — summary, timings, ingredients and method — rendered in
 * the app so a meal can be cooked from the plan itself. The link to the
 * source page is kept alongside it rather than replaced by it.
 *
 * Ingredients and method are accordion rows: both open on arrival, and either
 * one can be folded away by whoever only needs the other in front of them.
 */
export function RecipeBody({
  ingredientLines,
  instructionLines,
  source,
  offerIngredientLines = [],
  offers = [],
  servings,
  totalTimeMinutes,
  prepTimeMinutes,
  cookTimeMinutes,
  description,
  url,
}: RecipeBodyProps) {
  const onOffer = new Set(offerIngredientLines);

  return (
    <>
      {description && <p className="mb-3 text-sm">{description}</p>}

      {/* The calorie estimate stands on its own: a recipe can carry an
          ingredient list without stating servings or a time, and the figure
          is still worth having then. */}
      {(servings || totalTimeMinutes || ingredientLines.length > 0) && (
        <p className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
          {servings && <span>{t("recipeDetail.servings", { count: servings })}</span>}
          {totalTimeMinutes && <span>{t("recipeDetail.totalTime", { minutes: totalTimeMinutes })}</span>}
          {/* Prep/cook are a breakdown of the total above, not a replacement
              for it — some recipes state only one or the other. */}
          {prepTimeMinutes && <span>{t("recipeDetail.prepTime", { minutes: prepTimeMinutes })}</span>}
          {cookTimeMinutes && <span>{t("recipeDetail.cookTime", { minutes: cookTimeMinutes })}</span>}
          <CalorieMeta ingredientLines={ingredientLines} servings={servings} />
        </p>
      )}

      {/* No card here — a border and shadow around what's already the widest,
          most-used part of the page just repeats the page's own edges at a
          smaller size. Full-width accordion rows, hairline-separated, read
          as part of the page rather than a box within it. */}
      {(ingredientLines.length > 0 || instructionLines.length > 0) && (
        <div className="mb-3 flex flex-col">
          {ingredientLines.length > 0 && (
            <Accordion
              title={t("recipeDetail.ingredientsHeading")}
              meta={onOffer.size > 0 ? t("recipeDetail.onOfferCount", { count: onOffer.size }) : undefined}
            >
              <ul className="m-0 flex list-none flex-col p-0 text-sm">
                {ingredientLines.map((line, i) => {
                  const prices = offers.length > 0 ? offerPricesMatchingIngredient(line, offers) : [];
                  const highlighted = onOffer.has(line) || prices.length > 0;
                  return (
                    <li
                      key={i}
                      className="flex flex-wrap items-center justify-between gap-2 border-b border-divider py-2.5 last:border-b-0 last:pb-0"
                    >
                      <span className={`min-w-0 ${highlighted ? "font-medium" : ""}`}>{line}</span>
                      {highlighted && (
                        <span>
                          <Tag variant="accent">{t("recipeDetail.onOfferBadge")}</Tag>
                          {prices.length > 0 && (
                            <span className="ml-1 text-xs text-muted">
                              {t("recipeDetail.onOfferPrice", {
                                price: `${cheapest(prices).price} ${cheapest(prices).currencyCode}`,
                                store: STORE_NAMES[cheapest(prices).storeId],
                              })}
                            </span>
                          )}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Accordion>
          )}

          {instructionLines.length > 0 && (
            <Accordion title={t("recipeDetail.instructionsHeading")}>
              <ol className="m-0 flex list-decimal flex-col gap-2 pl-4.5 text-sm">
                {instructionLines.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </Accordion>
          )}
        </div>
      )}

      {/*
        Shown when the scrape produced no method for this recipe, so the card
        explains the gap and points at the source instead of looking broken.
      */}
      {ingredientLines.length === 0 && (
        <p className="mb-3 text-sm text-muted">{t("recipeDetail.noIngredients")}</p>
      )}

      {url && (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="text-[13px] font-semibold text-accent hover:text-accent-700"
        >
          {t("recipeDetail.viewOriginal")}
        </a>
      )}

      {source && source !== "rema1000" && (
        <p className="m-0 mt-1 text-xs text-muted">{t("recipeDetail.importedFrom", { source })}</p>
      )}
    </>
  );
}
