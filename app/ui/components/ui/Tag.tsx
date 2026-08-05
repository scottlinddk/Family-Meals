import type { ReactNode } from "react";

type TagVariant = "accent" | "accent-2" | "neutral" | "outline";

const variantClasses: Record<TagVariant, string> = {
  accent: "bg-accent-100 text-accent-700",
  "accent-2": "bg-accent-2-100 text-accent-2-700",
  neutral: "bg-neutral-100 text-neutral-700",
  outline: "border border-divider text-text",
};

/** A small, softly-cornered label. */
export function Tag({ children, variant = "neutral" }: { children: ReactNode; variant?: TagVariant }) {
  return (
    <span
      className={`inline-flex items-center rounded-sm px-2.5 py-1 text-[11px] font-semibold ${variantClasses[variant]}`}
    >
      {children}
    </span>
  );
}
