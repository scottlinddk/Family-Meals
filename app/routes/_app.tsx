import { Outlet } from "react-router";
import type { Route } from "./+types/_app";
import { redirectToLogin, requireUser } from "~/lib/auth";
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
  const headers = new Headers();
  const user = await requireUser(request, headers);
  if (!user) return redirectToLogin(request, headers);
  // The email is the only thing about the signed-in person any page needs —
  // the "Bruger" card on /family names who is about to be signed out.
  return { email: user.email ?? null };
}

export default function AppLayout() {
  return (
    <>
      <TopNav />
      {/* The trailing padding clears the fixed bottom nav, so the last card
          of a page can still be scrolled out from behind it. */}
      <main className="mx-auto w-full max-w-3xl px-4 pt-5 pb-24 sm:px-6">
        <Outlet />
      </main>
      <BottomNav />
    </>
  );
}
