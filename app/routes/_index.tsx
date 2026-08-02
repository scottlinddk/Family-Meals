import { redirect } from "react-router";
import type { Route } from "./+types/_index";
import { requireUser } from "~/lib/auth";
import { mondayOf, todayIso } from "~/lib/time";

export async function loader({ request }: Route.LoaderArgs) {
  const headers = new Headers();
  const user = await requireUser(request, headers);
  if (!user) return redirect("/auth/login", { headers });

  return redirect(`/weeks/${mondayOf(todayIso())}`, { headers });
}
