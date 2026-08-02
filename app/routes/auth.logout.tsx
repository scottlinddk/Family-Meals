import { redirect } from "react-router";
import type { Route } from "./+types/auth.logout";
import { createSupabaseServerClient } from "~/lib/auth";

/** Signs the current user out and sends them back to the login page. */
export async function action({ request }: Route.ActionArgs) {
  const headers = new Headers();
  const supabase = createSupabaseServerClient(request, headers);
  await supabase.auth.signOut();
  return redirect("/auth/login", { headers });
}
