import { Outlet } from "react-router";
import type { Route } from "./+types/_app";
import { redirectToLoginIfSignedOut } from "~/lib/auth";
import { TopNav } from "~/ui/components/TopNav";
import { BottomNav } from "~/ui/components/BottomNav";

/**
 * Pathless layout wrapping every signed-in page. It owns the two things each
 * of those pages used to repeat for itself: the auth guard, and the page
 * chrome (the mint header band, the centred content column, and the bottom
 * nav). Keeping the guard here means a new page under this layout is
 * signed-in-only by construction.
 *
 * Signed-out visitors are sent to the login form with `redirectTo` pointing
 * back at the page they asked for, so a bookmarked or shared deep link
 * survives the detour through sign-in.
 */
export async function loader({ request }: Route.LoaderArgs) {
  return redirectToLoginIfSignedOut(request, new Headers());
}

export default function AppLayout() {
  return (
    <>
      <TopNav />
      {/* The trailing padding clears the fixed bottom nav, so the last card
          of a page can still be scrolled out from behind it. */}
      <main className="mx-auto w-full max-w-3xl px-4 pt-6 pb-28 sm:px-6">
        <Outlet />
      </main>
      <BottomNav />
    </>
  );
}
