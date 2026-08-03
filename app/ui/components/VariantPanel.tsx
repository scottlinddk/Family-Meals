import type { AdultVariant, ChildVariant } from "~/domain/types";
import { Card, CardTitle } from "~/ui/components/ui/Card";
import { t } from "~/i18n/t";

export function AdultVariantPanel({ variant }: { variant: AdultVariant }) {
  return (
    <Card>
      <CardTitle>{t("variant.adultsHeading")}</CardTitle>
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
    </Card>
  );
}

export function ChildVariantPanel({ variant }: { variant: ChildVariant }) {
  return (
    <Card>
      <CardTitle>{t("variant.childHeading")}</CardTitle>
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
        <ul className="m-0 list-disc pl-4.5 text-[13px] opacity-75">
          {variant.textureNotes.map((note, i) => (
            <li key={i}>{note}</li>
          ))}
        </ul>
      )}
    </Card>
  );
}
