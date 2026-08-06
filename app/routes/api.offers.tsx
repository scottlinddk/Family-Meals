import type { Route } from "./+types/api.offers";
import { requireFamily } from "~/lib/auth";
import { offerRepository } from "~/data/repositories/offerRepository";
import { offerListSchema } from "~/adapters/offerSource/offerSchema";

/**
 * GET: the family's latest offer import — the snapshot's metadata, the
 * offers on now, and the offers not yet started (REMA's next catalog, once
 * `EtilbudsavisOfferSource` picks it up ahead of this week's end), so the
 * page can say "12 of 40 still valid" rather than silently hiding expired
 * rows, and can show next week's offers separately from this week's.
 */
export async function loader({ request }: Route.LoaderArgs) {
  const headers = new Headers();
  const family = await requireFamily(request, headers);

  const snapshot = await offerRepository.getLatestSnapshot(family.id);
  const [current, upcoming, all] = await Promise.all([
    offerRepository.listCurrentOffers(family.id),
    offerRepository.listUpcomingOffers(family.id),
    snapshot ? offerRepository.listOffersInSnapshot(snapshot.id) : Promise.resolve([]),
  ]);

  return new Response(
    JSON.stringify({
      snapshot: snapshot ?? null,
      offers: current,
      upcomingOffers: upcoming,
      importedCount: all.length,
    }),
    { headers: { ...Object.fromEntries(headers), "Content-Type": "application/json" } },
  );
}

/** POST: replace the current offer set with a fresh manual entry/JSON paste, validated against the reference schema. */
export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const headers = new Headers();
  const family = await requireFamily(request, headers);
  const body = await request.json();
  const parsed = offerListSchema.safeParse(body);

  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "invalid_offers", issues: parsed.error.issues }), {
      status: 400,
      headers: { ...Object.fromEntries(headers), "Content-Type": "application/json" },
    });
  }

  await offerRepository.replaceCurrentOffers(family.id, parsed.data, "manual");
  return new Response(JSON.stringify({ ok: true, count: parsed.data.length }), {
    headers: { ...Object.fromEntries(headers), "Content-Type": "application/json" },
  });
}
