import type { Route } from "./+types/api.family";
import { requireFamily } from "~/lib/auth";
import { familyRepository } from "~/data/repositories/familyRepository";

/** GET: the signed-in user's family record (used to build the ICS subscribe URL). */
export async function loader({ request }: Route.LoaderArgs) {
  const headers = new Headers();
  const family = await requireFamily(request, headers);
  return new Response(JSON.stringify({ id: family.id, name: family.name, calendarToken: family.calendarToken }), {
    headers: { ...Object.fromEntries(headers), "Content-Type": "application/json" },
  });
}

/** PATCH: rename the signed-in user's family. */
export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "PATCH") {
    return new Response("Method not allowed", { status: 405 });
  }

  const headers = new Headers();
  const family = await requireFamily(request, headers);
  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name : "";
  const updated = await familyRepository.rename(family.id, name);

  return new Response(JSON.stringify({ id: updated.id, name: updated.name }), {
    headers: { ...Object.fromEntries(headers), "Content-Type": "application/json" },
  });
}
