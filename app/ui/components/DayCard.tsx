import { Link } from "react-router";
import type { DayPlan } from "~/domain/types";
import { AdultVariantPanel, ChildVariantPanel } from "~/ui/components/VariantPanel";
import { RegenerateDayButton } from "~/ui/components/RegenerateDayButton";
import { RecipeBody } from "~/ui/components/RecipeBody";
import { Card, CardKicker } from "~/ui/components/ui/Card";
import { Tag } from "~/ui/components/ui/Tag";
import { todayIso } from "~/lib/time";
import { t } from "~/i18n/t";

/**
 * One day of the plan.
 *
 * `expanded` is used on the single-day page, where the full recipe is shown
 * inline so the meal can be cooked from the app. The week grid keeps the
 * compact form — title, timing and an on-offer count — to stay scannable, with
 * the title linking to the day page rather than off-site. The link to REMA's
 * original page is kept in both forms.
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
    <Card as="article" className={`p-4 ${isToday ? "border-accent" : ""}`}>
      <header className="mb-1 flex items-start justify-between gap-2">
        <div className="flex items-start gap-3">
          {snapshot.imageUrl && (
            <img
              src={snapshot.imageUrl}
              alt=""
              width={56}
              height={56}
              loading="lazy"
              className="h-14 w-14 shrink-0 rounded-md object-cover"
            />
          )}
          <div>
            <CardKicker>
              {weekday} · {day.date}
              {isToday && <span className="ml-2 text-accent">{t("week.today")}</span>}
            </CardKicker>
            {expanded ? (
              <h3 className="mt-1 text-2xl">{snapshot.title}</h3>
            ) : (
              <h3 className="mt-1 text-2xl">
                <Link to={`/weeks/${weekStart}/day/${dayIndex}`} className="hover:underline">
                  {snapshot.title}
                </Link>
              </h3>
            )}
            <p className="m-0 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
              {snapshot.servings && <span>{t("recipeDetail.servings", { count: snapshot.servings })}</span>}
              {snapshot.totalTimeMinutes && (
                <span>{t("recipeDetail.totalTime", { minutes: snapshot.totalTimeMinutes })}</span>
              )}
              {offerCount > 0 && (
                <Tag variant="accent">{t("recipeDetail.onOfferCount", { count: offerCount })}</Tag>
              )}
            </p>
          </div>
        </div>
        <RegenerateDayButton weekStart={weekStart} dayIndex={dayIndex} />
      </header>

      {expanded ? (
        <RecipeBody
          description={snapshot.description}
          ingredientLines={snapshot.ingredientLines}
          instructionLines={snapshot.instructionLines}
          offerIngredientLines={snapshot.offerIngredientLines}
          url={snapshot.url}
        />
      ) : (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <Link to={`/weeks/${weekStart}/day/${dayIndex}`} className="text-accent hover:text-accent-700">
            {t("day.viewRecipe")}
          </Link>
          {snapshot.url && (
            <a href={snapshot.url} target="_blank" rel="noreferrer" className="text-muted hover:text-text">
              {t("day.viewOnRema")}
            </a>
          )}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <AdultVariantPanel variant={day.adultVariant} />
        <ChildVariantPanel variant={day.childVariant} />
      </div>
    </Card>
  );
}
