import { INFANT_NOTE } from "~/domain/infant/infantNote";
import { t } from "~/i18n/t";

/** Static, non-personalized reminder — the only infant-related content in the app. */
export function InfantNote() {
  return (
    <aside className="rounded-sm bg-neutral-100 p-3.5">
      <p className="m-0 text-xs font-semibold text-text">{t("infant.label")}</p>
      <p className="m-0 mt-1 text-xs leading-relaxed text-muted italic">{t(INFANT_NOTE.textKey)}</p>
    </aside>
  );
}
