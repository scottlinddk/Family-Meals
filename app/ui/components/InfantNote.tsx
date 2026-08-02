import { INFANT_NOTE } from "~/domain/infant/infantNote";
import { Badge } from "~/ui/components/ui/Badge";
import { t } from "~/i18n/t";

/** Static, non-personalized reminder — the only infant-related content in the app. */
export function InfantNote() {
  return (
    <aside className="rounded-lg border border-amber/30 bg-paper-warm p-4 text-sm text-ink-2">
      <Badge tone="ember">{t("infant.label")}</Badge>
      <p className="mt-2">{INFANT_NOTE.text}</p>
    </aside>
  );
}
