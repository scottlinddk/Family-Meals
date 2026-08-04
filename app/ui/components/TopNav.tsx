import { useEffect, useState } from "react";
import { Form, Link, NavLink, useLocation } from "react-router";
import { SubscribeCalloutModal } from "~/ui/components/SubscribeCalloutModal";
import { t, type TranslationKey } from "~/i18n/t";

/**
 * Primary navigation targets. `match` decides the "current page" highlight,
 * since the destinations are section roots (`/` bounces to the current week,
 * `/recipes` also owns `/recipes/:id`) rather than exact URLs.
 */
const NAV_LINKS: { to: string; labelKey: TranslationKey; match: (pathname: string) => boolean }[] = [
  { to: "/", labelKey: "nav.plan", match: (p) => p === "/" || p.startsWith("/weeks") },
  { to: "/recipes", labelKey: "week.recipes", match: (p) => p.startsWith("/recipes") },
  { to: "/offers", labelKey: "week.manageOffers", match: (p) => p.startsWith("/offers") },
  { to: "/family", labelKey: "week.family", match: (p) => p.startsWith("/family") },
];

const MENU_ID = "primary-nav-menu";

/**
 * Shared top nav bar, rendered on every signed-in page by the `_app` layout
 * route. Below `sm` the links/subscribe/sign-out collapse behind a hamburger
 * toggle instead of cramming into one row — above `sm` they render inline.
 *
 * The bar sticks to the top of the viewport so the menu stays reachable part
 * way down a long week plan, which is where it's most often wanted on a phone.
 */
export function TopNav() {
  const { pathname } = useLocation();

  // The panel's open state is stored as *where* it was opened, so any
  // navigation closes it implicitly — including ones the panel didn't start,
  // such as the browser's back button or a redirect out of an action.
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const open = openedAt === pathname;
  const setOpen = (next: boolean) => setOpenedAt(next ? pathname : null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenedAt(null);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <header className="sticky top-0 z-30 border-b border-divider bg-bg/95 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center gap-4 px-4 py-2 sm:px-6 sm:py-3">
        <Link to="/" className="mr-auto font-heading text-lg font-semibold hover:text-accent">
          {t("app.title")}
        </Link>

        <nav aria-label={t("nav.primary")} className="hidden items-center gap-4 sm:flex">
          {NAV_LINKS.map(({ to, labelKey, match }) => (
            <NavItemLink key={to} to={to} labelKey={labelKey} active={match(pathname)} />
          ))}
          <SubscribeCalloutModal />
          <SignOutButton />
        </nav>

        <button
          type="button"
          className="-mr-2 inline-flex h-11 w-11 items-center justify-center rounded-md text-xl leading-none hover:bg-text/7 sm:hidden"
          aria-label={t(open ? "nav.closeMenu" : "nav.openMenu")}
          aria-expanded={open}
          aria-controls={MENU_ID}
          onClick={() => setOpen(!open)}
        >
          <span aria-hidden="true">{open ? "✕" : "☰"}</span>
        </button>
      </div>

      {/* Toggled with display classes rather than the `hidden` attribute,
          which a `flex` utility would override. */}
      <nav
        id={MENU_ID}
        aria-label={t("nav.primary")}
        className={`${open ? "flex" : "hidden"} flex-col gap-1 border-t border-divider px-4 py-3 sm:hidden`}
      >
        {NAV_LINKS.map(({ to, labelKey, match }) => (
          <NavItemLink key={to} to={to} labelKey={labelKey} active={match(pathname)} block />
        ))}
        <div className="mt-2 flex flex-col gap-2 border-t border-divider pt-3">
          <SubscribeCalloutModal block />
          <SignOutButton block />
        </div>
      </nav>
    </header>
  );
}

function NavItemLink({
  to,
  labelKey,
  active,
  block = false,
}: {
  to: string;
  labelKey: TranslationKey;
  active: boolean;
  block?: boolean;
}) {
  return (
    <NavLink
      to={to}
      aria-current={active ? "page" : undefined}
      className={`text-sm hover:text-accent ${
        active ? "text-accent underline underline-offset-4" : ""
      } ${block ? "flex min-h-11 items-center rounded-md px-2 hover:bg-text/7" : ""}`}
    >
      {t(labelKey)}
    </NavLink>
  );
}

function SignOutButton({ block = false }: { block?: boolean }) {
  return (
    <Form method="post" action="/auth/logout" className={block ? "w-full" : undefined}>
      <button
        type="submit"
        className={`text-sm hover:text-accent ${
          block ? "flex min-h-11 w-full items-center rounded-md px-2 hover:bg-text/7" : ""
        }`}
      >
        {t("week.signOut")}
      </button>
    </Form>
  );
}
