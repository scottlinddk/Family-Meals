import type { ReactNode } from "react";

export function Chip({ children, active = false }: { children: ReactNode; active?: boolean }) {
  return (
    <span
      className={
        active
          ? "inline-flex items-center rounded-full bg-ember px-3.5 py-1.5 text-xs font-medium text-paper"
          : "inline-flex items-center rounded-full border border-line-2 px-3.5 py-1.5 text-xs text-ink-2"
      }
    >
      {children}
    </span>
  );
}
