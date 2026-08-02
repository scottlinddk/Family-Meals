import type { Route } from "./+types/api.calendar-token.rotate";
import { requireFamily } from "~/lib/auth";
import { familyRepository } from "~/data/repositories/familyRepository";

/** POST: rotate the family's ICS subscription token (e.g. because the link leaked). */
export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const headers = new Headers();
  const family = await requireFamily(request, headers);
  const updated = await familyRepository.rotateCalendarToken(family.id);

  return new Response(JSON.stringify({ calendarToken: updated.calendarToken }), {
    headers: { ...Object.fromEntries(headers), "Content-Type": "application/json" },
  });
}
