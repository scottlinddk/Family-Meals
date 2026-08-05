import { Link } from "react-router";
import { ChevronLeftIcon } from "~/ui/components/Icon";

/**
 * The way back up a level, in the one shape every page uses: a chevron and a
 * label, sitting quietly above the page's own heading.
 */
export function BackLink({ to, children }: { to: string; children: string }) {
  return (
    <Link
      to={to}
      className="-ml-1 inline-flex min-h-11 items-center gap-1 pr-2 pl-1 text-[13px] font-semibold text-muted transition-colors hover:text-accent"
    >
      <ChevronLeftIcon size={16} />
      {children}
    </Link>
  );
}
