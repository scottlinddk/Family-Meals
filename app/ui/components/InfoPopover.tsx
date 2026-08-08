import { useId, useState } from "react";
import { BottomSheet } from "~/ui/components/ui/BottomSheet";
import { Button } from "~/ui/components/ui/Button";
import { InfoIcon } from "~/ui/components/Icon";
import { t } from "~/i18n/t";

export type InfoPopoverItem = {
  heading: string;
  body: string;
};

/**
 * A small "i" trigger that keeps a reminder out of the layout until someone
 * asks for it, and reveals it in the app's one dialog shape (`BottomSheet`)
 * instead of a hover tooltip — the target this app cares about is a thumb,
 * not a mouse.
 *
 * Takes a list of items rather than a single string so a second reminder can
 * be appended later — a different age group, a different caveat — without
 * a new trigger or a new dialog shape.
 */
export function InfoPopover({ ariaLabel, items }: { ariaLabel: string; items: InfoPopoverItem[] }) {
  const [open, setOpen] = useState(false);
  const headingId = useId();

  if (items.length === 0) return null;

  return (
    <>
      <button
        type="button"
        aria-label={ariaLabel}
        onClick={() => setOpen(true)}
        className="inline-flex size-5 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:text-accent"
      >
        <InfoIcon size={17} />
      </button>

      <BottomSheet open={open} onClose={() => setOpen(false)} labelledBy={headingId}>
        <div className="flex flex-col gap-4">
          {items.map((item, i) => (
            <div key={item.heading} className="flex flex-col gap-1">
              {i === 0 ? (
                <h2 id={headingId} className="text-base font-bold">
                  {item.heading}
                </h2>
              ) : (
                <h3 className="text-base font-bold">{item.heading}</h3>
              )}
              <p className="m-0 text-sm leading-relaxed text-muted">{item.body}</p>
            </div>
          ))}
        </div>
        <Button type="button" variant="secondary" block onClick={() => setOpen(false)}>
          {t("info.close")}
        </Button>
      </BottomSheet>
    </>
  );
}
