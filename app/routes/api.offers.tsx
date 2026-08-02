import type { Route } from "./+types/api.offers";
import { requireFamily } from "~/lib/auth";
import { offerRepository } from "~/data/repositories/offerRepository";
import { offerListSchema } from "~/adapters/offerSource/offerSchema";

/** GET: list the currently-imported offers. */
export async function loader({ request }: Route.LoaderArgs) {
  const headers = new Headers();
  await requireFamily(request, headers);
  const offers = await offerRepository.listCurrentOffers();
  return new Response(JSON.stringify(offers), {
    headers: { ...Object.fromEntries(headers), "Content-Type": "application/json" },
  });
}

/** POST: replace the current offer set with a fresh manual entry/JSON paste, validated against the reference schema. */
export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const headers = new Headers();
  await requireFamily(request, headers);
  const body = await request.json();
  const parsed = offerListSchema.safeParse(body);

  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "invalid_offers", issues: parsed.error.issues }), {
      status: 400,
      headers: { ...Object.fromEntries(headers), "Content-Type": "application/json" },
    });
  }

  await offerRepository.replaceCurrentOffers(parsed.data);
  return new Response(JSON.stringify({ ok: true, count: parsed.data.length }), {
    headers: { ...Object.fromEntries(headers), "Content-Type": "application/json" },
  });
}
