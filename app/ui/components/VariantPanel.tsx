import type { AdultVariant, ChildVariant } from "~/domain/types";

export function AdultVariantPanel({ variant }: { variant: AdultVariant }) {
  return (
    <div className="rounded border border-gray-200 p-3">
      <p className="text-sm font-medium">Adults (calorie-minimized)</p>
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
      <p className="text-sm font-medium">Toddler (base dish + calorie-dense addition)</p>
      <ul className="mt-1 list-disc pl-4 text-sm text-gray-700">
        {variant.additions.map((addition, i) => (
          <li key={i}>
            Add {addition.quantity}
            {addition.unit} {addition.name}
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
