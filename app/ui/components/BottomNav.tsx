import { NavLink, useLocation } from "react-router";
import { BasketIcon, BookIcon, CalendarIcon, ChecklistIcon, UsersIcon } from "~/ui/components/Icon";
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
    // Excludes `/weeks/:weekStart/shopping-list`, which belongs to the
    // shopping list tab below rather than the plan it's nested under.
    match: (p) => (p === "/" || p.startsWith("/weeks")) && !p.includes("/shopping-list"),
  },
  { to: "/recipes", labelKey: "nav.recipes", Icon: BookIcon, match: (p) => p.startsWith("/recipes") },
  { to: "/offers", labelKey: "nav.offers", Icon: BasketIcon, match: (p) => p.startsWith("/offers") },
  {
    to: "/shopping-list",
    labelKey: "nav.shoppingList",
    Icon: ChecklistIcon,
    match: (p) => p.includes("/shopping-list"),
  },
  { to: "/family", labelKey: "nav.family", Icon: UsersIcon, match: (p) => p.startsWith("/family") },
];

/**
 * The five sections of the app, along the bottom of the screen.
 *
 * A flat white bar with a hairline above it — not floating, not a pill, not
 * dark — because it belongs to the page rather than hovering over it. The
 * current section turns green and grows a short underline beneath its label,
 * which is the one place in the app where a nav item is coloured at all.
 *
 * Kept deliberately low: it and the header band are on screen on every page
 * of the app, so every pixel they take is a pixel of plan nobody sees. Each
 * item is still a full column wide, which is what makes it a comfortable
 * target at this height.
 *
 * It replaces the old hamburger menu: five destinations are few enough to
 * always be on screen, and a plan you flick between week, recipes, offers
 * and the shopping list shouldn't cost two taps each time.
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
              viewTransition
              aria-current={active ? "page" : undefined}
              className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 pt-2 pb-1.5 text-[10px] leading-tight font-semibold transition-colors ${
                active ? "text-accent" : "text-muted hover:text-text"
              }`}
            >
              <Icon size={19} />
              {/* The label stays at 10px whatever else grows: "Bruger &
                  familie" already runs 77px of an 80px column at 320px. */}
              <span className="max-w-full truncate">{t(labelKey)}</span>
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
