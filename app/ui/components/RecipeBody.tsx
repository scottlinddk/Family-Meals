import { Accordion } from "~/ui/components/ui/Accordion";
import { Tag } from "~/ui/components/ui/Tag";
import { CalorieMeta } from "~/ui/components/RecipeCalories";
import { t } from "~/i18n/t";

export interface RecipeBodyProps {
  ingredientLines: string[];
  instructionLines: string[];
  /** Ingredient lines that are on offer, highlighted in the list. */
  offerIngredientLines?: string[];
  servings?: number;
  totalTimeMinutes?: number;
  description?: string;
  /** Original source page. Always rendered when present — never the only way in. */
  url?: string;
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
  offerIngredientLines = [],
  servings,
  totalTimeMinutes,
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
                {ingredientLines.map((line, i) => (
                  <li
                    key={i}
                    className="flex flex-wrap items-center justify-between gap-2 border-b border-divider py-2.5 last:border-b-0 last:pb-0"
                  >
                    <span className={`min-w-0 ${onOffer.has(line) ? "font-medium" : ""}`}>{line}</span>
                    {onOffer.has(line) && <Tag variant="accent">{t("recipeDetail.onOfferBadge")}</Tag>}
                  </li>
                ))}
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
    </>
  );
}
