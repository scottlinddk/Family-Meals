import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "border-accent text-accent hover:bg-accent/12 active:bg-accent/22",
  secondary: "border-divider hover:bg-text/7 active:bg-text/14",
  ghost: "border-transparent text-accent px-1 hover:bg-accent/10 active:bg-accent/18",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-2.5 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
};

export function Button({
  variant = "primary",
  size = "md",
  block = false,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize; block?: boolean }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-md border font-heading font-semibold leading-tight transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${variantClasses[variant]} ${sizeClasses[size]} ${block ? "w-full" : ""} ${className}`}
      {...props}
    />
  );
}
