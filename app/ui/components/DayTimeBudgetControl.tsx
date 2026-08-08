import { useState } from "react";
import { useUpdateDayPlan } from "~/ui/hooks/useUpdateDayPlan";
import { useRegenerateDay } from "~/ui/hooks/useRegenerateDay";
import { FieldLabel, Select } from "~/ui/components/ui/Input";
import { Button } from "~/ui/components/ui/Button";
import { BottomSheet } from "~/ui/components/ui/BottomSheet";
import { t } from "~/i18n/t";

/** Common budgets a weeknight dinner realistically falls into. */
const PRESET_MINUTES = [15, 30, 45, 60, 90, 120];

/**
 * Lets the family cap how long a given day's dinner is allowed to take to
 * prep and cook. Saves on change — there's nothing else to configure
 * alongside it, so a separate "save" step would only add a click.
 *
 * Saving the budget doesn't touch the recipe already planned for the day —
 * it only asks, via a confirmation sheet, whether to look for a new one that
 * fits. Declining leaves the current dish untouched with the new budget
 * recorded for next time the day gets regenerated.
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
  const regenerate = useRegenerateDay(weekStart);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [savedMinutes, setSavedMinutes] = useState<number | null>(null);

  function handleChange(value: string) {
    const minutes = value === "" ? null : Number(value);
    updateDay.mutate(
      { dayIndex, edit: { maxTimeMinutes: minutes } },
      {
        onSuccess: () => {
          setSavedMinutes(minutes);
          setConfirmOpen(true);
        },
      },
    );
  }

  function handleConfirm() {
    regenerate.mutate(dayIndex);
    setConfirmOpen(false);
  }

  const fieldId = `day-max-time-${weekStart}-${dayIndex}`;
  const headingId = `day-suggest-heading-${weekStart}-${dayIndex}`;

  return (
    <div>
      <FieldLabel htmlFor={fieldId}>{t("day.maxTimeLabel")}</FieldLabel>
      <Select
        id={fieldId}
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

      <BottomSheet open={confirmOpen} onClose={() => setConfirmOpen(false)} labelledBy={headingId}>
        <h2 id={headingId} className="text-lg font-bold">
          {t("day.suggestModalHeading")}
        </h2>
        <p className="m-0 text-[13px] text-muted">
          {savedMinutes
            ? t("day.suggestModalBody", { minutes: savedMinutes })
            : t("day.suggestModalBodyNoLimit")}
        </p>
        <div className="flex flex-col gap-2">
          <Button type="button" variant="primary" block onClick={handleConfirm} disabled={regenerate.isPending}>
            {regenerate.isPending ? t("dayCard.regenerating") : t("day.suggestModalConfirm")}
          </Button>
          <Button type="button" variant="secondary" block onClick={() => setConfirmOpen(false)}>
            {t("day.suggestModalCancel")}
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
}
