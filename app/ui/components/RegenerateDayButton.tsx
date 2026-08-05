import { useRegenerateDay } from "~/ui/hooks/useRegenerateDay";
import { Button } from "~/ui/components/ui/Button";
import { t } from "~/i18n/t";

export function RegenerateDayButton({
  weekStart,
  dayIndex,
  className,
}: {
  weekStart: string;
  dayIndex: number;
  className?: string;
}) {
  const regenerate = useRegenerateDay(weekStart);

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      className={`shrink-0 ${className ?? ""}`}
      onClick={() => regenerate.mutate(dayIndex)}
      disabled={regenerate.isPending}
    >
      {regenerate.isPending ? t("dayCard.regenerating") : t("dayCard.regenerateThisDay")}
    </Button>
  );
}
