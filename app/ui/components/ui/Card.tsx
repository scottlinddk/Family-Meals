import type { ElementType, HTMLAttributes } from "react";

export function Card({
  as: Tag = "div",
  className = "",
  ...props
}: HTMLAttributes<HTMLElement> & { as?: ElementType }) {
  return <Tag className={`rounded-xl border border-line bg-paper p-5 ${className}`} {...props} />;
}
