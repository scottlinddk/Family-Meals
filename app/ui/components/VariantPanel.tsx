import type { ReactNode } from "react";
import type { AdultVariant, ChildVariant } from "~/domain/types";
import { t } from "~/i18n/t";

/**
 * The two plates of one meal, side by side inside a day's card.
 *
 * A flat tinted panel rather than another card: a shadowed card nested in a
 * shadowed card reads as two layers of chrome, and these belong to the day
 * they sit in. The soft mint is the same tint the header band uses, at the
 * one strength the palette allows.
 */
function VariantSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-1.5 rounded-sm bg-accent-100 p-3.5">
      <h4 className="text-[13px] font-semibold text-accent-700">{title}</h4>
      {children}
    </section>
  );
}

export function AdultVariantPanel({ variant }: { variant: AdultVariant }) {
  return (
    <VariantSection title={t("variant.adultsHeading")}>
      {!variant.curated && <p className="m-0 text-[13px] text-muted italic">{t("variant.notCurated")}</p>}
      {variant.substitutions.length > 0 && (
        <ul className="m-0 list-disc pl-4.5 text-[13px]">
          {variant.substitutions.map((sub, i) => (
            <li key={i}>
              {sub.originalIngredient} → {sub.substituteIngredient}
              <span className="text-muted"> ({sub.reason})</span>
            </li>
          ))}
        </ul>
      )}
      {variant.portioningNotes.length > 0 && (
        <ul className="m-0 list-disc pl-4.5 text-[13px]">
          {variant.portioningNotes.map((note, i) => (
            <li key={i}>{note}</li>
          ))}
        </ul>
      )}
    </VariantSection>
  );
}

export function ChildVariantPanel({ variant }: { variant: ChildVariant }) {
  return (
    <VariantSection title={t("variant.childHeading")}>
      {!variant.curated && <p className="m-0 text-[13px] text-muted italic">{t("variant.notCurated")}</p>}
      {variant.additions.length > 0 && (
        <ul className="m-0 list-disc pl-4.5 text-[13px]">
          {variant.additions.map((addition, i) => (
            <li key={i}>
              {t("variant.addLabel", { qty: addition.quantity, unit: addition.unit, name: addition.name })}
            </li>
          ))}
        </ul>
      )}
      {variant.textureNotes.length > 0 && (
        <ul className="m-0 list-disc pl-4.5 text-[13px] text-muted">
          {variant.textureNotes.map((note, i) => (
            <li key={i}>{note}</li>
          ))}
        </ul>
      )}
    </VariantSection>
  );
}
