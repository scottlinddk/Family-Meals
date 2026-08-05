import type { ButtonHTMLAttributes } from "react";
import { Link, type LinkProps } from "react-router";

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

interface ButtonStyleProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  className?: string;
}

function buttonClasses({
  variant = "primary",
  size = "md",
  block = false,
  className = "",
}: ButtonStyleProps): string {
  return `inline-flex items-center justify-center gap-1.5 rounded-md border font-heading font-semibold leading-tight transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${variantClasses[variant]} ${sizeClasses[size]} ${block ? "w-full" : ""} ${className}`;
}

export function Button({
  variant,
  size,
  block,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & ButtonStyleProps) {
  return <button className={buttonClasses({ variant, size, block, className })} {...props} />;
}

/**
 * A navigation target that reads as a button. Kept here so an action that
 * happens to be a link (cook mode, say) can't drift away from the real
 * buttons' styling — it stays an `<a>`, so it opens in a new tab and shows
 * its destination like any other link.
 */
export function LinkButton({
  variant,
  size,
  block,
  className,
  ...props
}: LinkProps & ButtonStyleProps) {
  return <Link className={buttonClasses({ variant, size, block, className })} {...props} />;
}
