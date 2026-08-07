import type { Route } from "./+types/api.offers";
import { requireFamily } from "~/lib/auth";
import { offerRepository } from "~/data/repositories/offerRepository";
import { familyStoreSettingsRepository } from "~/data/repositories/familyStoreSettingsRepository";
import { offerListSchema } from "~/adapters/offerSource/offerSchema";
import type { StoreId } from "~/domain/types";

/**
 * GET: the family's latest offer import per selected store — each store's
 * snapshot metadata, the offers on now, and the offers not yet started (that
 * store's next catalog, once `EtilbudsavisOfferSource` picks it up ahead of
 * this week's end), so the page can say "12 of 40 still valid" per store
 * rather than silently hiding expired rows, and can show next week's offers
 * separately from this week's. Stores the family hasn't selected are
 * omitted entirely — not fetched, not returned.
 */
export async function loader({ request }: Route.LoaderArgs) {
  const headers = new Headers();
  const family = await requireFamily(request, headers);
  const settings = await familyStoreSettingsRepository.get(family.id);

  const stores: Record<string, unknown> = {};
  await Promise.all(
    settings.selectedStores.map(async (storeId) => {
      const snapshot = await offerRepository.getLatestSnapshot(family.id, storeId);
      const [current, upcoming, all] = await Promise.all([
        offerRepository.listCurrentOffers(family.id, [storeId]),
        offerRepository.listUpcomingOffers(family.id, [storeId]),
        snapshot ? offerRepository.listOffersInSnapshot(snapshot.id) : Promise.resolve([]),
      ]);
      stores[storeId] = {
        snapshot: snapshot ?? null,
        offers: current,
        upcomingOffers: upcoming,
        importedCount: all.length,
      };
    }),
  );

  return new Response(JSON.stringify({ stores, selectedStores: settings.selectedStores }), {
    headers: { ...Object.fromEntries(headers), "Content-Type": "application/json" },
  });
}

/**
 * POST: replace one store's current offer set with a fresh manual entry/JSON
 * paste, validated against the reference schema. Every offer in the pasted
 * batch must carry the same `storeId` — the paste form scopes one store per
 * submission (see `StoreOffersCard`), so a mixed-store batch is rejected
 * rather than silently split.
 */
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

  const storeIds = new Set(parsed.data.map((offer) => offer.storeId));
  if (storeIds.size > 1) {
    return new Response(JSON.stringify({ error: "mixed_stores" }), {
      status: 400,
      headers: { ...Object.fromEntries(headers), "Content-Type": "application/json" },
    });
  }
  const storeId = (storeIds.values().next().value ?? "rema1000") as StoreId;

  await offerRepository.replaceCurrentOffers(family.id, storeId, parsed.data, "manual");
  return new Response(JSON.stringify({ ok: true, count: parsed.data.length }), {
    headers: { ...Object.fromEntries(headers), "Content-Type": "application/json" },
  });
}
