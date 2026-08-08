import type { ReactNode } from "react";
import type { AdultVariant, ChildVariant } from "~/domain/types";
import { InfoPopover, type InfoPopoverItem } from "~/ui/components/InfoPopover";
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

/** Nothing to show for an uncurated variant — that's surfaced once, for both
 *  variants together, by `VariantGuidanceNote` instead of per panel. */
export function AdultVariantPanel({ variant }: { variant: AdultVariant }) {
  if (!variant.curated) return null;
  return (
    <VariantSection title={t("variant.adultsHeading")}>
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
  if (!variant.curated) return null;
  return (
    <VariantSection title={t("variant.childHeading")}>
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

/**
 * Both variant panels, side by side — omitted entirely when neither has
 * curated content, so a recipe with no guidance at all doesn't leave two
 * empty tinted boxes sitting in the card.
 */
export function VariantsGrid({
  adultVariant,
  childVariant,
}: {
  adultVariant: AdultVariant;
  childVariant: ChildVariant;
}) {
  if (!adultVariant.curated && !childVariant.curated) return null;
  // Only splits into two columns once there are two panels to fill them —
  // one curated variant alone stays full width rather than sitting in half
  // a row with empty space beside it.
  const bothCurated = adultVariant.curated && childVariant.curated;
  return (
    <div className={`grid gap-3 ${bothCurated ? "sm:grid-cols-2" : ""}`}>
      <AdultVariantPanel variant={adultVariant} />
      <ChildVariantPanel variant={childVariant} />
    </div>
  );
}

/**
 * One combined disclaimer for whichever of the two variants has no curated
 * guidance, behind a single info icon rather than one per panel — and meant
 * to sit outside the recipe card itself (a caption under it, not a section
 * of it), since it's a caveat about the app's coverage, not part of the
 * recipe.
 */
export function VariantGuidanceNote({
  adultVariant,
  childVariant,
}: {
  adultVariant: AdultVariant;
  childVariant: ChildVariant;
}) {
  const items: InfoPopoverItem[] = [];
  if (!adultVariant.curated) items.push({ heading: t("variant.adultsHeading"), body: t("variant.notCurated") });
  if (!childVariant.curated) items.push({ heading: t("variant.childHeading"), body: t("variant.notCurated") });

  if (items.length === 0) return null;

  const label = t("variant.guidanceMissingLabel");
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted">
      {label}
      <InfoPopover ariaLabel={label} items={items} />
    </div>
  );
}
