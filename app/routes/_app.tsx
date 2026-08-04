import { Outlet, redirect } from "react-router";
import type { Route } from "./+types/_app";
import { requireUser } from "~/lib/auth";
import { TopNav } from "~/ui/components/TopNav";

/**
 * Pathless layout wrapping every signed-in page. It owns the two things each
 * of those pages used to repeat for itself: the auth guard, and the page
 * chrome (top nav + centred content column). Keeping the guard here means a
 * new page under this layout is signed-in-only by construction.
 *
 * Signed-out visitors are sent to the login form with `redirectTo` pointing
 * back at the page they asked for, so a bookmarked or shared deep link
 * survives the detour through sign-in.
 */
export async function loader({ request }: Route.LoaderArgs) {
  const headers = new Headers();
  const user = await requireUser(request, headers);
  if (!user) {
    const { pathname, search } = new URL(request.url);
    const redirectTo = `${pathname}${search}`;
    const target =
      redirectTo === "/" ? "/auth/login" : `/auth/login?redirectTo=${encodeURIComponent(redirectTo)}`;
    return redirect(target, { headers });
  }
  return null;
}

export default function AppLayout() {
  return (
    <>
      <TopNav />
      <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
        <Outlet />
      </main>
    </>
  );
}
