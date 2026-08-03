import { useState } from "react";
import { Form, Link } from "react-router";
import { SubscribeCalloutModal } from "~/ui/components/SubscribeCalloutModal";
import { t, type TranslationKey } from "~/i18n/t";

const NAV_LINKS: { to: string; labelKey: TranslationKey }[] = [
  { to: "/recipes", labelKey: "week.recipes" },
  { to: "/offers", labelKey: "week.manageOffers" },
  { to: "/family", labelKey: "week.family" },
];

/**
 * Shared top nav bar. Below `sm`, the links/subscribe/sign-out collapse
 * behind a hamburger toggle instead of cramming into one row — above `sm`
 * they render inline as before.
 */
export function TopNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-divider">
      <div className="flex items-center gap-4 px-6 py-3">
        <span className="mr-auto text-lg font-semibold">{t("app.title")}</span>

        <nav className="hidden items-center gap-4 sm:flex">
          {NAV_LINKS.map(({ to, labelKey }) => (
            <Link key={to} to={to} className="text-sm hover:text-accent">
              {t(labelKey)}
            </Link>
          ))}
          <SubscribeCalloutModal />
          <Form method="post" action="/auth/logout">
            <button type="submit" className="text-sm hover:text-accent">
              {t("week.signOut")}
            </button>
          </Form>
        </nav>

        <button
          type="button"
          className="text-xl leading-none sm:hidden"
          aria-label={t("nav.toggleMenu")}
          aria-expanded={open}
          onClick={() => setOpen((prev) => !prev)}
        >
          {open ? "✕" : "☰"}
        </button>
      </div>

      {open && (
        <nav className="flex flex-col items-start gap-3 border-t border-divider px-6 py-3 sm:hidden">
          {NAV_LINKS.map(({ to, labelKey }) => (
            <Link key={to} to={to} className="text-sm hover:text-accent" onClick={() => setOpen(false)}>
              {t(labelKey)}
            </Link>
          ))}
          <SubscribeCalloutModal />
          <Form method="post" action="/auth/logout">
            <button type="submit" className="text-sm hover:text-accent">
              {t("week.signOut")}
            </button>
          </Form>
        </nav>
      )}
    </div>
  );
}
