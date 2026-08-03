import type { ElementType, HTMLAttributes, ReactNode } from "react";

export function Card({
  as: Tag = "div",
  className = "",
  ...props
}: HTMLAttributes<HTMLElement> & { as?: ElementType }) {
  return <Tag className={`flex flex-col gap-2 rounded-md border border-divider p-3.5 ${className}`} {...props} />;
}

export function CardKicker({ children }: { children: ReactNode }) {
  return <div className="text-[10px] tracking-[0.1em] text-accent uppercase">{children}</div>;
}

export function CardTitle({ children }: { children: ReactNode }) {
  return <div className="font-heading text-[17px] leading-tight font-semibold">{children}</div>;
}
