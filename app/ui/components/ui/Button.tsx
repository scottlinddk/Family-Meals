import type { ButtonHTMLAttributes } from "react";
import { Link, type LinkProps } from "react-router";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md";

/**
 * Green is the app's one accent, so only the primary action wears it filled.
 * Everything else is white behind a hairline, and hover only darkens — no
 * colour changes, nothing lifting off the page.
 */
const variantClasses: Record<ButtonVariant, string> = {
  primary: "border-transparent bg-accent text-white hover:bg-accent-700 active:bg-accent-800",
  secondary: "border-divider bg-surface text-text hover:bg-neutral-100 active:bg-neutral-200",
  ghost: "border-transparent text-accent hover:bg-accent-100 active:bg-accent-200",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-4 py-2 text-[13px]",
  md: "px-6 py-3 text-sm",
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
  return `inline-flex items-center justify-center gap-2 rounded-full border font-semibold leading-tight transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${variantClasses[variant]} ${sizeClasses[size]} ${block ? "w-full" : ""} ${className}`;
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
  viewTransition = true,
  ...props
}: LinkProps & ButtonStyleProps) {
  return (
    <Link
      viewTransition={viewTransition}
      className={buttonClasses({ variant, size, block, className })}
      {...props}
    />
  );
}

const iconButtonClasses =
  "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-divider bg-surface text-text transition-colors hover:bg-neutral-100 disabled:pointer-events-none disabled:opacity-40";

/**
 * A square icon-only control — the header's subscribe button, the week's
 * previous/next arrows. Same white-behind-a-hairline treatment as a secondary
 * button, sized to stay a comfortable tap target.
 */
export function IconButton({ className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={`${iconButtonClasses} ${className}`} {...props} />;
}

/** The same circle, when the control is a link rather than a button. */
export function IconLink({ className = "", viewTransition = true, ...props }: LinkProps) {
  return <Link viewTransition={viewTransition} className={`${iconButtonClasses} ${className}`} {...props} />;
}
