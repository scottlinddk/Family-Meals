import { INFANT_NOTE } from "~/domain/infant/infantNote";
import { t } from "~/i18n/t";

/** Static, non-personalized reminder — the only infant-related content in the app. */
export function InfantNote() {
  return (
    <aside className="rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <p className="font-medium">{t("infant.label")}</p>
      <p className="mt-1">{INFANT_NOTE.text}</p>
    </aside>
  );
}
