import type { Route } from "./+types/share.$token";
import { useSharedPlan } from "~/ui/hooks/useShare";
import { SharedDay, SharedRecipe, SharedWeek } from "~/ui/components/SharedPlanView";
import { CardKicker } from "~/ui/components/ui/Card";
import { SchemaOutOfDateError } from "~/lib/dbErrors";
import { t } from "~/i18n/t";

/**
 * A week, a day or a recipe, opened from the link a family member sent.
 *
 * No sign-in and no nav, like `/list/{token}` — the person holding this link
 * doesn't have an account here and hasn't asked for one. Unlike the shopping
 * list, there is nothing to press: this is the plan as it stands, and reading
 * it is the whole of what the link is for. A "make your own" line at the
 * bottom is the only way in to the rest of the app.
 *
 * The three kinds share this page rather than having one each, because the
 * token decides which one arrives — the visitor never picks — and everything
 * around the content (who sent it, what to do if the link is dead) is the
 * same for all three.
 */
export default function SharedPlanPage({ params }: Route.ComponentProps) {
  const shared = useSharedPlan(params.token!);
  const plan = shared.data;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pt-6 pb-12 sm:px-6">
      <header className="mb-4">
        <CardKicker>
          {plan?.familyName
            ? t("share.sharedByFamily", { family: plan.familyName })
            : t("share.sharedBy")}
        </CardKicker>
        {plan?.kind === "week" && (
          <h1 className="m-0 mt-1 text-2xl">{t("week.heading", { date: plan.weekStartDate })}</h1>
        )}
      </header>

      {shared.isError && (
        <p className="text-sm text-red-700">
          {shared.error instanceof SchemaOutOfDateError
            ? t("week.schemaOutOfDate")
            : t("share.loadFailed")}
        </p>
      )}

      {!shared.isError && plan === undefined && <p className="text-muted">{t("week.loading")}</p>}

      {/* Unknown or revoked token. Said plainly — a link that was taken back
          is not an error the holder can do anything about. */}
      {plan === null && <p className="text-muted">{t("share.notFound")}</p>}

      {/*
        A live link whose content has moved on: the week was never generated,
        the day was swapped out of the plan, the recipe left the cache on a
        re-scrape. Different from a dead link, and worth saying differently.
      */}
      {plan?.kind === "week" &&
        (plan.week ? <SharedWeek week={plan.week} /> : <p className="text-muted">{t("share.gone.week")}</p>)}

      {plan?.kind === "day" &&
        (plan.day ? <SharedDay day={plan.day} /> : <p className="text-muted">{t("share.gone.day")}</p>)}

      {plan?.kind === "recipe" &&
        (plan.recipe ? (
          <SharedRecipe recipe={plan.recipe} />
        ) : (
          <p className="text-muted">{t("share.gone.recipe")}</p>
        ))}

      {plan && (
        <p className="mt-8 border-t border-divider pt-4 text-[13px] text-muted">
          {t("share.madeWith")}{" "}
          <a href="/" className="font-semibold text-accent hover:text-accent-700">
            {t("app.title")}
          </a>
        </p>
      )}
    </main>
  );
}
