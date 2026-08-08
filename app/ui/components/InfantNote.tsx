import { INFANT_NOTE } from "~/domain/infant/infantNote";
import { InfoPopover } from "~/ui/components/InfoPopover";
import { t } from "~/i18n/t";

/**
 * Static, non-personalized reminder — the only infant-related content in the
 * app. The trigger is labelled generically ("age guidance") rather than with
 * the note's own heading, so it keeps reading correctly once a second item
 * (a different age, a different caveat) joins the one below it.
 */
export function InfantNote() {
  const calloutLabel = t("infant.calloutLabel");
  return (
    <div className="flex items-center gap-1.5 text-xs font-semibold text-muted">
      {calloutLabel}
      <InfoPopover
        ariaLabel={calloutLabel}
        items={[{ heading: t("infant.label"), body: t(INFANT_NOTE.textKey) }]}
      />
    </div>
  );
}
