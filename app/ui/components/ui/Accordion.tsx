import type { ReactNode } from "react";
import { ChevronDownIcon } from "~/ui/components/Icon";

/**
 * A hairline-separated section that can be folded away — the design system's
 * accordion row.
 *
 * Built on `<details>`, so it opens and closes without JavaScript and a
 * browser's find-in-page can still reach what's inside it. Sections start
 * open: on a recipe the ingredients are the reason the page was opened, and
 * collapsing is for getting them out of the way once, not for hiding them
 * from someone who just arrived.
 */
export function Accordion({
  title,
  meta,
  defaultOpen = true,
  children,
}: {
  title: string;
  /** A quiet second line of the row — a count, a time, a status. */
  meta?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details open={defaultOpen} className="border-b border-divider last:border-b-0">
      <summary className="accordion-summary flex min-h-14 items-center justify-between gap-3 py-4 text-[15px] font-semibold">
        <span className="flex flex-wrap items-baseline gap-x-2">
          {title}
          {meta && <span className="text-[13px] font-medium text-muted">{meta}</span>}
        </span>
        <ChevronDownIcon
          size={16}
          className="accordion-chevron shrink-0 text-muted transition-transform"
        />
      </summary>
      <div className="pb-4">{children}</div>
    </details>
  );
}
