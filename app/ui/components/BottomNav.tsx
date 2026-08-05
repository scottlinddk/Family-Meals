import { NavLink, useLocation } from "react-router";
import { BasketIcon, BookIcon, CalendarIcon, UsersIcon } from "~/ui/components/Icon";
import { t, type TranslationKey } from "~/i18n/t";

/**
 * Primary navigation targets. `match` decides the "current page" highlight,
 * since the destinations are section roots (`/` bounces to the current week,
 * `/recipes` also owns `/recipes/:id`) rather than exact URLs.
 */
const NAV_ITEMS: {
  to: string;
  labelKey: TranslationKey;
  Icon: typeof CalendarIcon;
  match: (pathname: string) => boolean;
}[] = [
  {
    to: "/",
    labelKey: "nav.plan",
    Icon: CalendarIcon,
    match: (p) => p === "/" || p.startsWith("/weeks"),
  },
  { to: "/recipes", labelKey: "nav.recipes", Icon: BookIcon, match: (p) => p.startsWith("/recipes") },
  { to: "/offers", labelKey: "nav.offers", Icon: BasketIcon, match: (p) => p.startsWith("/offers") },
  { to: "/family", labelKey: "nav.family", Icon: UsersIcon, match: (p) => p.startsWith("/family") },
];

/**
 * The four sections of the app, along the bottom of the screen.
 *
 * A flat white bar with a hairline above it — not floating, not a pill, not
 * dark — because it belongs to the page rather than hovering over it. The
 * current section turns green and grows a short underline beneath its label,
 * which is the one place in the app where a nav item is coloured at all.
 *
 * It replaces the old hamburger menu: four destinations are few enough to
 * always be on screen, and a plan you flick between week, recipes and offers
 * shouldn't cost two taps each time.
 */
export function BottomNav() {
  const { pathname } = useLocation();

  return (
    <nav
      aria-label={t("nav.primary")}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-divider bg-surface pb-[env(safe-area-inset-bottom)]"
    >
      <div className="mx-auto flex max-w-3xl">
        {NAV_ITEMS.map(({ to, labelKey, Icon, match }) => {
          const active = match(pathname);
          return (
            <NavLink
              key={to}
              to={to}
              aria-current={active ? "page" : undefined}
              className={`flex flex-1 flex-col items-center gap-1 pt-2.5 pb-1.5 text-[11px] font-semibold transition-colors ${
                active ? "text-accent" : "text-muted hover:text-text"
              }`}
            >
              <Icon size={19} />
              {t(labelKey)}
              <span
                aria-hidden="true"
                className={`h-[3px] w-5.5 rounded-full ${active ? "bg-accent" : ""}`}
              />
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
