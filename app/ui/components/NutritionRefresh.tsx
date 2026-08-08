import { useNutritionCoverage, useRefreshNutrition } from "~/ui/hooks/useNutrition";
import { Button } from "~/ui/components/ui/Button";
import { t } from "~/i18n/t";

/**
 * Fills the nutrition cache from FatSecret, a batch at a time.
 *
 * Deliberately a visible, manual control rather than something that happens
 * behind a recipe scrape. Each ingredient term costs two calls against a
 * rate-limited key, so the person spending that budget should be the one who
 * decided to — and the counter tells them what a press bought and how much is
 * left, which "Refreshing…" followed by silence would not.
 *
 * With no credentials configured the panel says so plainly instead of
 * offering a button that can only fail; the app goes on ranking dinners by
 * the ingredient-line calorie estimate either way.
 */
export function NutritionRefresh() {
  const coverage = useNutritionCoverage();
  const refresh = useRefreshNutrition();

  if (coverage.data && !coverage.data.configured) {
    return <p className="mt-2 mb-0 text-sm text-muted">{t("nutrition.notConfigured")}</p>;
  }

  const missing = coverage.data?.missing ?? 0;
  const done = coverage.data !== undefined && missing === 0;

  return (
    <div className="mt-2">
      <Button
        type="button"
        variant="secondary"
        block
        onClick={() => refresh.mutate()}
        disabled={refresh.isPending || done}
      >
        {refresh.isPending
          ? t("nutrition.refreshing")
          : done
            ? t("nutrition.upToDate")
            : t("nutrition.refresh", { missing })}
      </Button>

      {coverage.data && (
        <p className="mt-1 mb-0 text-sm text-muted">
          {t("nutrition.coverage", {
            matched: coverage.data.matched,
            terms: coverage.data.terms,
            unmatched: coverage.data.unmatched,
          })}
        </p>
      )}

      {refresh.isError && (
        <p className="mt-1 mb-0 text-sm text-red-700">
          {t("nutrition.refreshError")}{" "}
          {refresh.error instanceof Error ? refresh.error.message : ""}
        </p>
      )}

      {/*
        A refresh that resolved nothing because the key isn't allowlisted must
        not read like a vocabulary FatSecret happens not to know — so the
        failures get their own line, in red, with the first reason quoted.
      */}
      {refresh.isSuccess && refresh.data && (
        <>
          <p className="mt-1 mb-0 text-sm text-muted">
            {t("nutrition.refreshed", {
              lookedUp: refresh.data.lookedUp,
              matched: refresh.data.matched,
              remaining: refresh.data.remaining,
            })}
          </p>
          {refresh.data.failureCount > 0 && (
            <p className="mt-1 mb-0 text-sm text-red-700">
              {t("nutrition.refreshFailures", {
                count: refresh.data.failureCount,
                message: refresh.data.failures[0]?.message ?? "",
              })}
            </p>
          )}
        </>
      )}
    </div>
  );
}
