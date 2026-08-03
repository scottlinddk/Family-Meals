import { redirect } from "react-router";
import type { Route } from "./+types/auth.callback";
import { createSupabaseServerClient } from "~/lib/auth";

/** Exchanges the magic-link code for a session, then sends the user to their week view. */
export async function loader({ request }: Route.LoaderArgs) {
  const headers = new Headers();
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (code) {
    const supabase = createSupabaseServerClient(request, headers);
    await supabase.auth.exchangeCodeForSession(code);
  }

  const redirectTo = url.searchParams.get("redirectTo") || "/";
  return redirect(redirectTo, { headers });
}
