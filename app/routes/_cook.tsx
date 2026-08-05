import { Outlet } from "react-router";
import type { Route } from "./+types/_cook";
import { redirectToLoginIfSignedOut } from "~/lib/auth";

/**
 * Pathless layout for cook mode. It keeps `_app`'s auth guard — these are the
 * same private pages — but deliberately not its chrome: no top nav, no
 * centred article column. Cook mode owns the whole viewport, because
 * everything else on screen competes with the pan.
 */
export async function loader({ request }: Route.LoaderArgs) {
  return redirectToLoginIfSignedOut(request, new Headers());
}

export default function CookLayout() {
  return <Outlet />;
}
