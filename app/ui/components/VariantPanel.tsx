import type { AdultVariant, ChildVariant } from "~/domain/types";
import { t } from "~/i18n/t";

export function AdultVariantPanel({ variant }: { variant: AdultVariant }) {
  return (
    <div className="rounded border border-gray-200 p-3">
      <p className="text-sm font-medium">{t("variant.adultsHeading")}</p>
      {variant.substitutions.length > 0 && (
        <ul className="mt-1 list-disc pl-4 text-sm text-gray-700">
          {variant.substitutions.map((sub, i) => (
            <li key={i}>
              {sub.originalIngredient} → {sub.substituteIngredient}
              <span className="text-gray-500"> ({sub.reason})</span>
            </li>
          ))}
        </ul>
      )}
      {variant.portioningNotes.length > 0 && (
        <ul className="mt-1 list-disc pl-4 text-sm text-gray-700">
          {variant.portioningNotes.map((note, i) => (
            <li key={i}>{note}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ChildVariantPanel({ variant }: { variant: ChildVariant }) {
  return (
    <div className="rounded border border-gray-200 p-3">
      <p className="text-sm font-medium">{t("variant.childHeading")}</p>
      <ul className="mt-1 list-disc pl-4 text-sm text-gray-700">
        {variant.additions.map((addition, i) => (
          <li key={i}>
            {t("variant.addLabel", { qty: addition.quantity, unit: addition.unit, name: addition.name })}
          </li>
        ))}
      </ul>
      {variant.textureNotes.length > 0 && (
        <ul className="mt-1 list-disc pl-4 text-sm text-gray-500">
          {variant.textureNotes.map((note, i) => (
            <li key={i}>{note}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
