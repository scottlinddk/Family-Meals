import type { ReactNode } from "react";

type TagVariant = "accent" | "accent-2" | "neutral" | "outline";

const variantClasses: Record<TagVariant, string> = {
  accent: "bg-accent-100 text-accent-800",
  "accent-2": "bg-accent-2-100 text-accent-2-800",
  neutral: "bg-neutral-100 text-neutral-800",
  outline: "border border-accent text-accent",
};

export function Tag({ children, variant = "neutral" }: { children: ReactNode; variant?: TagVariant }) {
  return (
    <span className={`inline-flex items-center rounded-sm px-2.5 py-0.5 text-[11px] tracking-wide ${variantClasses[variant]}`}>
      {children}
    </span>
  );
}
