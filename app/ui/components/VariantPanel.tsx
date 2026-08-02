import type { AdultVariant, ChildVariant } from "~/domain/types";

export function AdultVariantPanel({ variant }: { variant: AdultVariant }) {
  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      <p className="font-mono text-[10.5px] tracking-[0.14em] text-muted uppercase">
        Adults · calorie-minimized
      </p>
      {variant.substitutions.length > 0 && (
        <ul className="mt-2 list-disc pl-4 text-sm text-ink-2">
          {variant.substitutions.map((sub, i) => (
            <li key={i}>
              {sub.originalIngredient} → {sub.substituteIngredient}
              <span className="text-muted"> ({sub.reason})</span>
            </li>
          ))}
        </ul>
      )}
      {variant.portioningNotes.length > 0 && (
        <ul className="mt-2 list-disc pl-4 text-sm text-ink-2">
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
    <div className="rounded-lg border border-line bg-surface p-4">
      <p className="font-mono text-[10.5px] tracking-[0.14em] text-muted uppercase">
        Toddler · base dish + calorie-dense addition
      </p>
      <ul className="mt-2 list-disc pl-4 text-sm text-ink-2">
        {variant.additions.map((addition, i) => (
          <li key={i}>
            Add {addition.quantity}
            {addition.unit} {addition.name}
          </li>
        ))}
      </ul>
      {variant.textureNotes.length > 0 && (
        <ul className="mt-2 list-disc pl-4 text-sm text-muted">
          {variant.textureNotes.map((note, i) => (
            <li key={i}>{note}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
