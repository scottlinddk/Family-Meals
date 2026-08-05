import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export function FieldLabel({ children, htmlFor }: { children: string; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-[13px] font-semibold text-text">
      {children}
    </label>
  );
}

const fieldClasses =
  "w-full min-h-11 rounded-sm border border-divider bg-surface px-4 py-2.5 text-sm text-text outline-none transition-colors placeholder:text-muted hover:border-neutral-300 focus-visible:border-accent";

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${fieldClasses} ${className}`} {...props} />;
}

export function Textarea({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${fieldClasses} min-h-24 resize-y font-mono text-xs ${className}`} {...props} />;
}

export function Select({ className = "", ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`${fieldClasses} select-chevron ${className}`} {...props} />;
}

/**
 * The search bar of the design system: a white pill carrying its own shadow
 * rather than a border, with the magnifier inside it. Used where searching is
 * the point of the screen — everywhere else a plain `Input` is right.
 */
export function SearchInput({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex items-center gap-2.5 rounded-full bg-surface px-5 py-1 shadow-sm ring-1 ring-divider focus-within:ring-accent">
      <svg
        aria-hidden="true"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className="shrink-0 text-muted"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4.3-4.3" />
      </svg>
      <input
        className={`min-h-11 w-full bg-transparent text-sm text-text outline-none placeholder:text-muted ${className}`}
        {...props}
      />
    </div>
  );
}
