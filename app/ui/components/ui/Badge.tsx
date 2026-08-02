import type { ReactNode } from "react";

type BadgeTone = "brick" | "olive" | "ember";

const toneClasses: Record<BadgeTone, string> = {
  brick: "bg-paper-warm text-brick border-brick/20",
  olive: "bg-olive/10 text-olive border-olive/25",
  ember: "bg-ember/10 text-ember-2 border-ember/25",
};

export function Badge({ children, tone = "brick" }: { children: ReactNode; tone?: BadgeTone }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded font-mono text-[10.5px] tracking-[0.14em] uppercase border px-2 py-1 ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}
