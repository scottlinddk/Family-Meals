import { Card, CardTitle } from "~/ui/components/ui/Card";
import { Tag } from "~/ui/components/ui/Tag";
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

      {(servings || totalTimeMinutes) && (
        <p className="mb-3 flex flex-wrap gap-x-4 text-sm text-muted">
          {servings && <span>{t("recipeDetail.servings", { count: servings })}</span>}
          {totalTimeMinutes && <span>{t("recipeDetail.totalTime", { minutes: totalTimeMinutes })}</span>}
        </p>
      )}

      {ingredientLines.length > 0 && (
        <Card className="mb-3">
          <CardTitle>{t("recipeDetail.ingredientsHeading")}</CardTitle>
          {onOffer.size > 0 && (
            <p className="m-0 text-xs text-muted">
              {t("recipeDetail.onOfferCount", { count: onOffer.size })}
            </p>
          )}
          <ul className="m-0 flex list-none flex-col gap-1 p-0 text-sm">
            {ingredientLines.map((line, i) => (
              <li key={i} className="flex flex-wrap items-center gap-2">
                <span className={onOffer.has(line) ? "font-medium" : undefined}>{line}</span>
                {onOffer.has(line) && <Tag variant="accent">{t("recipeDetail.onOfferBadge")}</Tag>}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {instructionLines.length > 0 && (
        <Card className="mb-3">
          <CardTitle>{t("recipeDetail.instructionsHeading")}</CardTitle>
          <ol className="m-0 flex list-decimal flex-col gap-1.5 pl-4.5 text-sm">
            {instructionLines.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </Card>
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
          className="text-sm text-accent hover:text-accent-700"
        >
          {t("recipeDetail.viewOriginal")}
        </a>
      )}
    </>
  );
}
