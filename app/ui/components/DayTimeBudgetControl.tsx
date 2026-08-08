import { useId } from "react";
import { useUpdateDayPlan } from "~/ui/hooks/useUpdateDayPlan";
import { FieldLabel, Select } from "~/ui/components/ui/Input";
import { t } from "~/i18n/t";

/** Common budgets a weeknight dinner realistically falls into. */
const PRESET_MINUTES = [15, 30, 45, 60, 90, 120];

/**
 * Lets the family cap how long a day's dinner is allowed to take to prep and
 * cook. Saves on change — there's nothing else to configure alongside it, so
 * a separate "save" step would only add a click. Regenerating the day (the
 * button already on `DayCard`) is what actually applies the budget to the
 * recipe pick; this control only sets it.
 *
 * Used both on the single-day page (labeled) and, `compact`, once per row of
 * the week grid — where seven full-height labeled fields would overwhelm the
 * card, so the label collapses to an `aria-label` and the field shrinks to
 * an inline control instead of a block one.
 */
export function DayTimeBudgetControl({
  weekStart,
  dayIndex,
  maxTimeMinutes,
  compact = false,
}: {
  weekStart: string;
  dayIndex: number;
  maxTimeMinutes?: number;
  compact?: boolean;
}) {
  const updateDay = useUpdateDayPlan(weekStart);
  const id = useId();

  function handleChange(value: string) {
    const minutes = value === "" ? null : Number(value);
    updateDay.mutate({ dayIndex, edit: { maxTimeMinutes: minutes } });
  }

  const select = (
    <Select
      id={compact ? undefined : id}
      aria-label={compact ? t("day.maxTimeLabel") : undefined}
      value={maxTimeMinutes ?? ""}
      onChange={(e) => handleChange(e.target.value)}
      disabled={updateDay.isPending}
    >
      <option value="">{t("day.maxTimeNoLimit")}</option>
      {PRESET_MINUTES.map((minutes) => (
        <option key={minutes} value={minutes}>
          {t("recipeDetail.totalTime", { minutes })}
        </option>
      ))}
    </Select>
  );

  if (compact) {
    return (
      <div className="max-w-40">
        {select}
        {updateDay.isError && <p className="mt-1 text-xs text-red-700">{t("day.maxTimeSaveFailed")}</p>}
      </div>
    );
  }

  return (
    <div>
      <FieldLabel htmlFor={id}>{t("day.maxTimeLabel")}</FieldLabel>
      {select}
      {updateDay.isError && <p className="mt-1.5 text-xs text-red-700">{t("day.maxTimeSaveFailed")}</p>}
    </div>
  );
}
