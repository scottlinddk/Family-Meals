import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Every dialog in the app, in one shape: a white sheet that comes up from the
 * bottom of the screen with a drag-handle bar at its top, over a dimmed page.
 * It's the phone-shaped way to show a dialog — the content arrives under the
 * thumb rather than in the middle of the screen — and on a wide window it
 * simply stays a centred column of the same width.
 *
 * Escape and a tap on the backdrop both close it, as well as whatever "Luk"
 * button the caller puts in `children`.
 */
export function BottomSheet({
  open,
  onClose,
  labelledBy,
  children,
}: {
  open: boolean;
  onClose: () => void;
  /** Id of the heading inside `children` that names the sheet. */
  labelledBy: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  // Rendered into the document body rather than where it was written: the
  // trigger lives inside the sticky header, whose own z-index would otherwise
  // trap the sheet below the bottom nav. Nothing renders while closed, so the
  // server pass and the first client render agree.
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-neutral-900/45 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        // `pb-6` alone sat the sheet's content flush against an iPhone's home
        // indicator — `BottomNav` already adds `env(safe-area-inset-bottom)`
        // for the same reason, this just matches it here.
        className="relative flex max-h-[88vh] w-full max-w-md flex-col gap-3 overflow-y-auto rounded-t-lg bg-surface px-5 pt-7 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-lg sm:rounded-lg sm:pb-6"
        onClick={(event) => event.stopPropagation()}
      >
        <span
          aria-hidden="true"
          className="absolute top-2.5 left-1/2 h-1 w-9 -translate-x-1/2 rounded-full bg-divider"
        />
        {children}
      </div>
    </div>,
    document.body,
  );
}
