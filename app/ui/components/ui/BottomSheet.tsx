import { useEffect, useState, type ReactNode } from "react";
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
// How long the slide-and-fade takes, both in and out — the Tailwind duration
// class below and the unmount delay have to agree, since the delay is what
// keeps the sheet in the DOM long enough to play its own exit.
const TRANSITION_MS = 200;

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
  // `mounted` keeps the sheet in the DOM for the exit transition. `entered`
  // is what actually drives the transform/opacity, flipped a frame after
  // mount so the browser has a "closed" state to transition away from —
  // gated on `open` too, so a close always reads as entered=false straight
  // away without needing its own synchronous reset.
  const [mounted, setMounted] = useState(open);
  const [enteredInternal, setEnteredInternal] = useState(false);
  const entered = open && enteredInternal;

  if (open && !mounted) {
    setMounted(true);
  }

  useEffect(() => {
    if (!open) {
      const timeout = setTimeout(() => {
        setMounted(false);
        setEnteredInternal(false);
      }, TRANSITION_MS);
      return () => clearTimeout(timeout);
    }
    const frame = requestAnimationFrame(() => setEnteredInternal(true));
    return () => cancelAnimationFrame(frame);
  }, [open]);

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
  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-40 flex items-end justify-center bg-neutral-900/45 transition-opacity duration-200 sm:items-center sm:p-4 ${
        entered ? "opacity-100" : "opacity-0"
      }`}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        // `pb-6` alone sat the sheet's content flush against an iPhone's home
        // indicator — `BottomNav` already adds `env(safe-area-inset-bottom)`
        // for the same reason, this just matches it here.
        className={`relative flex max-h-[88vh] w-full max-w-md flex-col gap-3 overflow-y-auto rounded-t-lg bg-surface px-5 pt-7 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-lg transition-[transform,opacity] duration-200 ease-out motion-reduce:transition-none sm:rounded-lg sm:pb-6 ${
          entered ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        }`}
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
