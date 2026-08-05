import { Form, Link } from "react-router";
import { SubscribeCalloutModal } from "~/ui/components/SubscribeCalloutModal";
import { IconButton } from "~/ui/components/ui/Button";
import { SignOutIcon } from "~/ui/components/Icon";
import { t } from "~/i18n/t";

/**
 * The mint band across the top of every signed-in page.
 *
 * It carries only what belongs to the whole app rather than to a page: who
 * this is (the brand, which is also the way home), the calendar subscription,
 * and the way out. Moving between sections is the bottom nav's job now, so
 * the band can stay a flat, quiet strip — the one block of colour the design
 * system allows, with a straight bottom edge and nothing bleeding past it.
 */
export function TopNav() {
  return (
    <header className="sticky top-0 z-30 bg-band">
      <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-3 sm:px-6">
        <Link
          to="/"
          className="mr-auto text-lg font-bold tracking-[-0.01em] text-accent-700 transition-opacity hover:opacity-80"
        >
          {t("app.title")}
        </Link>

        <SubscribeCalloutModal />

        <Form method="post" action="/auth/logout">
          <IconButton type="submit" aria-label={t("week.signOut")} title={t("week.signOut")}>
            <SignOutIcon />
          </IconButton>
        </Form>
      </div>
    </header>
  );
}
