import type { ElementType, HTMLAttributes, ReactNode } from "react";

/**
 * A white panel with a hairline and a soft shadow — the one surface shape
 * the app uses for grouped content. `interactive` adds the resting-to-lifted
 * shadow change a card gets when the whole of it is a link or a button.
 */
export function Card({
  as: Tag = "div",
  interactive = false,
  className = "",
  ...props
}: HTMLAttributes<HTMLElement> & { as?: ElementType; interactive?: boolean }) {
  return (
    <Tag
      className={`flex flex-col gap-2 rounded-md border border-divider bg-surface p-4 shadow-sm ${
        interactive ? "transition-shadow hover:shadow-md" : ""
      } ${className}`}
      {...props}
    />
  );
}

export function CardKicker({ children }: { children: ReactNode }) {
  return (
    <div className="text-[11px] font-semibold tracking-[0.08em] text-accent-700 uppercase">
      {children}
    </div>
  );
}

export function CardTitle({ children }: { children: ReactNode }) {
  return <div className="text-[17px] leading-tight font-semibold">{children}</div>;
}
