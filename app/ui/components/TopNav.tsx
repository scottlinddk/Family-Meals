import { Link } from "react-router";
import { SubscribeCalloutModal } from "~/ui/components/SubscribeCalloutModal";
import { t } from "~/i18n/t";

/**
 * The deep-green band across the top of every signed-in page — the same
 * colour as the app's one accent, so the brand strip and the primary action
 * always read as a single colour rather than two greens.
 *
 * It carries only what belongs to the whole app rather than to a page: who
 * this is (the brand, which is also the way home) and the calendar
 * subscription. Moving between sections is the bottom nav's job, and signing
 * out now lives on the "Bruger & familie" page with the rest of what's true
 * about the person rather than the page — so the band can stay a flat, quiet
 * strip, one control wide, with a straight bottom edge and nothing bleeding
 * past it.
 */
export function TopNav() {
  return (
    <header className="sticky top-0 z-30 bg-band">
      <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-1.5 sm:px-6">
        <Link
          to="/"
          viewTransition
          className="mr-auto min-w-0 truncate text-base font-bold tracking-[-0.01em] text-white transition-opacity hover:opacity-80"
        >
          {t("app.title")}
        </Link>

        <SubscribeCalloutModal />
      </div>
    </header>
  );
}
