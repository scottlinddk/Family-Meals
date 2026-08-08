import { useUpdateDayPlan } from "~/ui/hooks/useUpdateDayPlan";
import { FieldLabel, Select } from "~/ui/components/ui/Input";
import { t } from "~/i18n/t";

/** Common budgets a weeknight dinner realistically falls into. */
const PRESET_MINUTES = [15, 30, 45, 60, 90, 120];

/**
 * Lets the family cap how long today's dinner is allowed to take to prep and
 * cook. Saves on change — there's nothing else to configure alongside it, so
 * a separate "save" step would only add a click. Regenerating the day (the
 * button already on `DayCard`) is what actually applies the budget to the
 * recipe pick; this control only sets it.
 */
export function DayTimeBudgetControl({
  weekStart,
  dayIndex,
  maxTimeMinutes,
}: {
  weekStart: string;
  dayIndex: number;
  maxTimeMinutes?: number;
}) {
  const updateDay = useUpdateDayPlan(weekStart);

  function handleChange(value: string) {
    const minutes = value === "" ? null : Number(value);
    updateDay.mutate({ dayIndex, edit: { maxTimeMinutes: minutes } });
  }

  return (
    <div>
      <FieldLabel htmlFor="day-max-time">{t("day.maxTimeLabel")}</FieldLabel>
      <Select
        id="day-max-time"
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
      {updateDay.isError && <p className="mt-1.5 text-xs text-red-700">{t("day.maxTimeSaveFailed")}</p>}
    </div>
  );
}
