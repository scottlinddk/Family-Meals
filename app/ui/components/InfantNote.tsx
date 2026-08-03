import { INFANT_NOTE } from "~/domain/infant/infantNote";
import { t } from "~/i18n/t";

/** Static, non-personalized reminder — the only infant-related content in the app. */
export function InfantNote() {
  return (
    <aside>
      <p className="text-xs font-medium text-text/70">{t("infant.label")}</p>
      <p className="mt-0.5 text-xs italic opacity-60">{INFANT_NOTE.text}</p>
    </aside>
  );
}
