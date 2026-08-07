import { Link } from "react-router";
import type { DayPlan } from "~/domain/types";
import {
  VariantsGrid,
  VariantGuidanceNote,
} from "~/ui/components/VariantPanel";
import { RegenerateDayButton } from "~/ui/components/RegenerateDayButton";
import { RecipeBody } from "~/ui/components/RecipeBody";
import { ShareButton } from "~/ui/components/ShareButton";
import { CalorieMeta } from "~/ui/components/RecipeCalories";
import { Card, CardKicker } from "~/ui/components/ui/Card";
import { LinkButton } from "~/ui/components/ui/Button";
import { Tag } from "~/ui/components/ui/Tag";
import { HeroPhoto, ThumbPhoto } from "~/ui/components/ui/Photo";
import { ChevronRightIcon } from "~/ui/components/Icon";
import { todayIso } from "~/lib/time";
import { t } from "~/i18n/t";

/**
 * One day of the plan.
 *
 * `expanded` is used on the single-day page, where the dish gets a hero photo
 * across the top of the card and the full recipe is shown inline so the meal
 * can be cooked from the app. The week grid keeps the compact form — a
 * rounded thumbnail, title, timing and an on-offer count — to stay scannable,
 * with the title linking to the day page rather than off-site. The link to
 * REMA's original page is kept in both forms.
 */
export function DayCard({
  day,
  weekStart,
  dayIndex,
  expanded = false,
}: {
  day: DayPlan;
  weekStart: string;
  dayIndex: number;
  expanded?: boolean;
}) {
  const weekday = new Date(`${day.date}T00:00:00`).toLocaleDateString("da-DK", {
    weekday: "long",
  });
  const snapshot = day.recipeSnapshot;
  const offerCount = snapshot.offerIngredientLines?.length ?? 0;
  const isToday = day.date === todayIso();

  return (
    <Card
      as="article"
      interactive={!expanded}
      // The hero runs to the card's own edges, so the padding moves inside.
      className={`gap-3 p-0 ${isToday ? "border-accent" : ""}`}
    >
      {expanded && snapshot.imageUrl && (
        <HeroPhoto
          src={snapshot.imageUrl}
          time={snapshot.totalTimeMinutes}
          className="overflow-hidden rounded-md"
        />
      )}

      <div
        className={`flex flex-col gap-4 pt-0 first:pt-3 ${expanded ? "sm:p-5 sm:pt-0 sm:first:pt-5" : ""}`}
      >
        <header className="flex flex-col gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            {!expanded && snapshot.imageUrl && (
              <ThumbPhoto src={snapshot.imageUrl} size={64} />
            )}
            <div className="min-w-0">
              <CardKicker>
                {weekday} · {day.date}
                {isToday && (
                  <span className="ml-2 text-accent">{t("week.today")}</span>
                )}
              </CardKicker>
              {expanded ? (
                <h1 className="mt-2 text-3xl">{snapshot.title}</h1>
              ) : (
                <h3 className="mt-1 text-[17px] leading-snug">
                  <Link
                    to={`/weeks/${weekStart}/day/${dayIndex}`}
                    className="hover:text-accent"
                  >
                    {snapshot.title}
                  </Link>
                </h3>
              )}
              {/* Servings, time and calories are the recipe's own facts, so on
                    the day page they belong to `RecipeBody` below rather than
                    being repeated up here. The offer count stays either way:
                    it's about this week, not about the dish. */}
              <p className="m-0 mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted">
                {snapshot.servings && !expanded && (
                  <span>
                    {t("recipeDetail.servings", { count: snapshot.servings })}
                  </span>
                )}
                {snapshot.totalTimeMinutes && !expanded && (
                  <span>
                    {t("recipeDetail.totalTime", {
                      minutes: snapshot.totalTimeMinutes,
                    })}
                  </span>
                )}
                {!expanded && (
                  <CalorieMeta
                    ingredientLines={snapshot.ingredientLines}
                    servings={snapshot.servings}
                  />
                )}
                {offerCount > 0 && (
                  <Tag variant="accent">
                    {t("recipeDetail.onOfferCount", { count: offerCount })}
                  </Tag>
                )}
              </p>
            </div>
          </div>
        </header>

        {expanded ? (
          <>
            {/* Each action gets its own half of the row rather than a tight
                  inline cluster, so the three things you can do with an
                  evening's dinner read as clear, separate choices. */}
            <div className="grid grid-cols-2 gap-3">
              <LinkButton
                to={`/weeks/${weekStart}/day/${dayIndex}/cook`}
                size="md"
                block
              >
                {t("cook.open")}
              </LinkButton>
              <ShareButton
                target={{ kind: "day", date: day.date }}
                size="md"
                block
              />
              {/* Odd one out in the 2-column grid — spans both rather than
                    leaving an empty column beside it. */}
              <RegenerateDayButton
                weekStart={weekStart}
                dayIndex={dayIndex}
                size="md"
                block
                className="col-span-2"
              />
            </div>
            <RecipeBody
              description={snapshot.description}
              servings={snapshot.servings}
              ingredientLines={snapshot.ingredientLines}
              instructionLines={snapshot.instructionLines}
              offerIngredientLines={snapshot.offerIngredientLines}
              url={snapshot.url}
            />
          </>
        ) : (
          <div className="flex flex-col gap-2">
            <LinkButton
              to={`/weeks/${weekStart}/day/${dayIndex}`}
              variant="secondary"
              size="sm"
              block
              className="justify-between"
            >
              {t("day.viewRecipe")}
              <ChevronRightIcon size={14} />
            </LinkButton>
            <LinkButton
              to={`/weeks/${weekStart}/day/${dayIndex}/cook`}
              variant="secondary"
              size="sm"
              block
            >
              {t("cook.open")}
            </LinkButton>
            <RegenerateDayButton
              weekStart={weekStart}
              dayIndex={dayIndex}
              block
            />
            {/* A plain text link, not another button — this is a way off
                  the app rather than a thing to do in it, so it stays
                  quieter than the actions above. */}
            {snapshot.url && (
              <a
                href={snapshot.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-1 px-4 py-1.5 text-center text-[12px] text-muted underline decoration-divider underline-offset-2 transition-colors hover:text-accent"
              >
                {t("day.viewOnRema")}
              </a>
            )}
          </div>
        )}

        <VariantsGrid
          adultVariant={day.adultVariant}
          childVariant={day.childVariant}
        />

        {/* Inside the card: a caveat about this recipe's coverage. */}
        <VariantGuidanceNote
          adultVariant={day.adultVariant}
          childVariant={day.childVariant}
        />
      </div>
    </Card>
  );
}
