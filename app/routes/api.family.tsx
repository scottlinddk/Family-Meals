import type { Route } from "./+types/api.family";
import { requireFamily } from "~/lib/auth";

/** GET: the signed-in user's family record (used to build the ICS subscribe URL). */
export async function loader({ request }: Route.LoaderArgs) {
  const headers = new Headers();
  const family = await requireFamily(request, headers);
  return new Response(JSON.stringify({ id: family.id, calendarToken: family.calendarToken }), {
    headers: { ...Object.fromEntries(headers), "Content-Type": "application/json" },
  });
}
