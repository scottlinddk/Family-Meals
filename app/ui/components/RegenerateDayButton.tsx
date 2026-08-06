import { useRegenerateDay } from "~/ui/hooks/useRegenerateDay";
import { Button } from "~/ui/components/ui/Button";
import { t } from "~/i18n/t";

export function RegenerateDayButton({
  weekStart,
  dayIndex,
  className,
  size = "sm",
  block = false,
}: {
  weekStart: string;
  dayIndex: number;
  className?: string;
  size?: "sm" | "md";
  block?: boolean;
}) {
  const regenerate = useRegenerateDay(weekStart);

  return (
    <Button
      type="button"
      variant="secondary"
      size={size}
      block={block}
      className={`shrink-0 ${className ?? ""}`}
      onClick={() => regenerate.mutate(dayIndex)}
      disabled={regenerate.isPending}
    >
      {regenerate.isPending ? t("dayCard.regenerating") : t("dayCard.regenerateThisDay")}
    </Button>
  );
}
