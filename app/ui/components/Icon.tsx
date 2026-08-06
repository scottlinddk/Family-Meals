import type { SVGProps } from "react";

/**
 * The app's icon set: outline glyphs drawn inline, in one weight, from the
 * same 24px grid. Inline rather than an icon font or a package because there
 * are only a handful of them and they have to be there on a cold, offline
 * start — nothing to fetch, nothing to fall back from.
 */
function Glyph({ size = 20, ...props }: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    />
  );
}

export function CalendarIcon(props: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <Glyph {...props}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </Glyph>
  );
}

export function BookIcon(props: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <Glyph {...props}>
      <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v15H6.5A2.5 2.5 0 0 0 4 19.5z" />
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20v5H6.5A2.5 2.5 0 0 1 4 19.5z" />
    </Glyph>
  );
}

export function BasketIcon(props: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <Glyph {...props}>
      <path d="M6 2l1.5 4h9L18 2" />
      <path d="M3.5 8h17l-1.4 12.1a2 2 0 0 1-2 1.9H6.9a2 2 0 0 1-2-1.9L3.5 8z" />
    </Glyph>
  );
}

export function UsersIcon(props: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <Glyph {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
    </Glyph>
  );
}

export function ChevronLeftIcon(props: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <Glyph {...props}>
      <path d="M15 18l-6-6 6-6" />
    </Glyph>
  );
}

export function ChevronRightIcon(props: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <Glyph {...props}>
      <path d="M9 18l6-6-6-6" />
    </Glyph>
  );
}

export function ChevronDownIcon(props: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <Glyph {...props}>
      <path d="M6 9l6 6 6-6" />
    </Glyph>
  );
}

export function ClockIcon(props: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <Glyph {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </Glyph>
  );
}

export function CloseIcon(props: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <Glyph {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Glyph>
  );
}

export function SignOutIcon(props: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <Glyph {...props}>
      <path d="M15 17l5-5-5-5" />
      <path d="M20 12H9" />
      <path d="M12 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6" />
    </Glyph>
  );
}

export function InfoIcon(props: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <Glyph {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.5" />
      <path d="M12 7.5v.01" />
    </Glyph>
  );
}

export function ChecklistIcon(props: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <Glyph {...props}>
      <path d="M9 6h11M9 12h11M9 18h11" />
      <path d="m4 6 1 1 2-2" />
      <path d="m4 12 1 1 2-2" />
      <path d="m4 18 1 1 2-2" />
    </Glyph>
  );
}
