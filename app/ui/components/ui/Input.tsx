import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export function FieldLabel({ children, htmlFor }: { children: string; htmlFor?: string }) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-2 block font-mono text-[10.5px] tracking-[0.16em] text-muted uppercase"
    >
      {children}
    </label>
  );
}

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-md border border-line-2 bg-surface px-3.5 py-3 font-sans text-sm text-ink outline-none placeholder:text-muted focus:border-ember focus:ring-3 focus:ring-ember/20 ${className}`}
      {...props}
    />
  );
}

export function Textarea({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`w-full rounded-md border border-line-2 bg-surface px-3.5 py-3 font-mono text-xs text-ink outline-none placeholder:text-muted focus:border-ember focus:ring-3 focus:ring-ember/20 ${className}`}
      {...props}
    />
  );
}

export function Select({ className = "", ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`w-full rounded-md border border-line-2 bg-surface px-3.5 py-3 font-sans text-sm text-ink outline-none focus:border-ember focus:ring-3 focus:ring-ember/20 ${className}`}
      {...props}
    />
  );
}
