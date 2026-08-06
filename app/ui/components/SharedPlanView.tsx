import type { DayPlan, ExternalRecipe, WeekPlan } from "~/domain/types";
import { RecipeBody } from "~/ui/components/RecipeBody";
import { AdultVariantPanel, ChildVariantPanel } from "~/ui/components/VariantPanel";
import { CalorieMeta } from "~/ui/components/RecipeCalories";
import { Card, CardKicker, CardTitle } from "~/ui/components/ui/Card";
import { Tag } from "~/ui/components/ui/Tag";
import { HeroPhoto, ThumbPhoto } from "~/ui/components/ui/Photo";
import { t } from "~/i18n/t";

/** "onsdag", from an ISO date, in the app's locale. */
function weekdayName(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString("da-DK", { weekday: "long" });
}

/**
 * A shared week: seven dinners at a glance.
 *
 * Deliberately the *compact* form of each day — photo, weekday, dish, timing
 * — rather than seven full recipes. Someone sent this to say "here's what
 * we're eating"; a page that opened with 70 ingredient lines would bury that,
 * and the day link exists for when one particular dinner is the point.
 */
export function SharedWeek({ week }: { week: WeekPlan }) {
  return (
    <div className="grid gap-4">
      {week.days.map((day) => (
        <SharedWeekDay key={day.date} day={day} />
      ))}
    </div>
  );
}

function SharedWeekDay({ day }: { day: DayPlan }) {
  const snapshot = day.recipeSnapshot;
  const offerCount = snapshot.offerIngredientLines?.length ?? 0;

  return (
    <Card as="article">
      <div className="flex items-start gap-3">
        {snapshot.imageUrl && <ThumbPhoto src={snapshot.imageUrl} size={64} />}
        <div className="min-w-0">
          <CardKicker>
            {weekdayName(day.date)} · {day.date}
          </CardKicker>
          <CardTitle>{snapshot.title}</CardTitle>
          <p className="m-0 mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted">
            {snapshot.servings && <span>{t("recipeDetail.servings", { count: snapshot.servings })}</span>}
            {snapshot.totalTimeMinutes && (
              <span>{t("recipeDetail.totalTime", { minutes: snapshot.totalTimeMinutes })}</span>
            )}
            <CalorieMeta ingredientLines={snapshot.ingredientLines} servings={snapshot.servings} />
            {offerCount > 0 && (
              <Tag variant="accent">{t("recipeDetail.onOfferCount", { count: offerCount })}</Tag>
            )}
          </p>
        </div>
      </div>

      {snapshot.url && (
        <a
          href={snapshot.url}
          target="_blank"
          rel="noreferrer"
          className="text-[13px] font-semibold text-accent hover:text-accent-700"
        >
          {t("day.viewOnRema")}
        </a>
      )}
    </Card>
  );
}

/**
 * A shared day: the whole dinner, including both variants.
 *
 * The adult and child variants come along because they're what makes this
 * plan *this* family's — the grandparent cooking on Thursday needs to know
 * the toddler's plate isn't the one being cut down.
 */
export function SharedDay({ day }: { day: DayPlan }) {
  const snapshot = day.recipeSnapshot;

  return (
    <>
      {snapshot.imageUrl && (
        <HeroPhoto
          src={snapshot.imageUrl}
          time={snapshot.totalTimeMinutes}
          className="mt-2 mb-4 overflow-hidden rounded-md"
        />
      )}

      <h1 className="m-0 mb-4 text-2xl">{snapshot.title}</h1>

      <RecipeBody
        description={snapshot.description}
        servings={snapshot.servings}
        totalTimeMinutes={snapshot.totalTimeMinutes}
        ingredientLines={snapshot.ingredientLines}
        instructionLines={snapshot.instructionLines}
        offerIngredientLines={snapshot.offerIngredientLines}
        url={snapshot.url}
      />

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <AdultVariantPanel variant={day.adultVariant} />
        <ChildVariantPanel variant={day.childVariant} />
      </div>
    </>
  );
}

/** A shared recipe: the recipe itself, exactly as the app shows it. */
export function SharedRecipe({ recipe }: { recipe: ExternalRecipe }) {
  return (
    <>
      {recipe.imageUrl && (
        <HeroPhoto
          src={recipe.imageUrl}
          time={recipe.totalTimeMinutes}
          className="mt-2 mb-4 overflow-hidden rounded-md"
        />
      )}

      <h1 className="m-0 mb-4 text-2xl">{recipe.title}</h1>

      <RecipeBody
        description={recipe.description}
        servings={recipe.servings}
        totalTimeMinutes={recipe.totalTimeMinutes}
        ingredientLines={recipe.ingredients}
        instructionLines={recipe.instructions}
        url={recipe.url}
      />
    </>
  );
}
