import { Link } from "react-router";
import type { DayPlan } from "~/domain/types";
import { AdultVariantPanel, ChildVariantPanel } from "~/ui/components/VariantPanel";
import { RegenerateDayButton } from "~/ui/components/RegenerateDayButton";
import { RecipeBody } from "~/ui/components/RecipeBody";
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
  const weekday = new Date(`${day.date}T00:00:00`).toLocaleDateString("da-DK", { weekday: "long" });
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
          className="overflow-hidden rounded-t-md"
        />
      )}

      <div className="flex flex-col gap-3 p-4 pt-0 first:pt-4">
        <header className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            {!expanded && snapshot.imageUrl && <ThumbPhoto src={snapshot.imageUrl} size={64} />}
            <div className="min-w-0">
              <CardKicker>
                {weekday} · {day.date}
                {isToday && <span className="ml-2 text-accent">{t("week.today")}</span>}
              </CardKicker>
              {expanded ? (
                <h1 className="mt-1 text-2xl">{snapshot.title}</h1>
              ) : (
                <h3 className="mt-1 text-[17px] leading-snug">
                  <Link to={`/weeks/${weekStart}/day/${dayIndex}`} className="hover:text-accent">
                    {snapshot.title}
                  </Link>
                </h3>
              )}
              <p className="m-0 mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted">
                {snapshot.servings && <span>{t("recipeDetail.servings", { count: snapshot.servings })}</span>}
                {snapshot.totalTimeMinutes && !expanded && (
                  <span>{t("recipeDetail.totalTime", { minutes: snapshot.totalTimeMinutes })}</span>
                )}
                {offerCount > 0 && (
                  <Tag variant="accent">{t("recipeDetail.onOfferCount", { count: offerCount })}</Tag>
                )}
              </p>
            </div>
          </div>
          {/* On the day page there's room beside the title; in the week list
              the button would squeeze the dish's name into two or three
              lines, so it joins the row of actions below instead. */}
          {expanded && <RegenerateDayButton weekStart={weekStart} dayIndex={dayIndex} />}
        </header>

        {expanded ? (
          <>
            <LinkButton to={`/weeks/${weekStart}/day/${dayIndex}/cook`} className="self-start">
              {t("cook.open")}
            </LinkButton>
            <RecipeBody
              description={snapshot.description}
              ingredientLines={snapshot.ingredientLines}
              instructionLines={snapshot.instructionLines}
              offerIngredientLines={snapshot.offerIngredientLines}
              url={snapshot.url}
            />
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] font-semibold">
              <Link
                to={`/weeks/${weekStart}/day/${dayIndex}`}
                className="inline-flex items-center gap-1 text-accent hover:text-accent-700"
              >
                {t("day.viewRecipe")}
                <ChevronRightIcon size={14} />
              </Link>
              <Link
                to={`/weeks/${weekStart}/day/${dayIndex}/cook`}
                className="text-accent hover:text-accent-700"
              >
                {t("cook.open")}
              </Link>
              {snapshot.url && (
                <a href={snapshot.url} target="_blank" rel="noreferrer" className="text-muted hover:text-text">
                  {t("day.viewOnRema")}
                </a>
              )}
            </div>
            <RegenerateDayButton weekStart={weekStart} dayIndex={dayIndex} className="self-start" />
          </>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <AdultVariantPanel variant={day.adultVariant} />
          <ChildVariantPanel variant={day.childVariant} />
        </div>
      </div>
    </Card>
  );
}
