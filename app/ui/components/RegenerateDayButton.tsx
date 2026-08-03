import { useRegenerateDay } from "~/ui/hooks/useRegenerateDay";
import { Button } from "~/ui/components/ui/Button";
import { t } from "~/i18n/t";

export function RegenerateDayButton({ weekStart, dayIndex }: { weekStart: string; dayIndex: number }) {
  const regenerate = useRegenerateDay(weekStart);

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={() => regenerate.mutate(dayIndex)}
      disabled={regenerate.isPending}
    >
      {regenerate.isPending ? t("dayCard.regenerating") : t("dayCard.regenerateThisDay")}
    </Button>
  );
}
