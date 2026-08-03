import type { Route } from "./+types/api.family.switch";
import { switchActiveFamily } from "~/lib/auth";

/** POST: makes `familyId` the signed-in user's active family (must already be a member). */
export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const headers = new Headers();
  const body = await request.json().catch(() => ({}));
  const familyId = typeof body.familyId === "string" ? body.familyId : "";
  const jsonHeaders = { ...Object.fromEntries(headers), "Content-Type": "application/json" };

  if (!familyId) {
    return new Response(JSON.stringify({ error: "familyId is required." }), { status: 400, headers: jsonHeaders });
  }

  const switched = await switchActiveFamily(request, headers, familyId);
  if (!switched) {
    return new Response(JSON.stringify({ error: "You are not a member of that family." }), {
      status: 403,
      headers: jsonHeaders,
    });
  }

  return new Response(JSON.stringify({ familyId }), {
    headers: { ...Object.fromEntries(headers), "Content-Type": "application/json" },
  });
}
