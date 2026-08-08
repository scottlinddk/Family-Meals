import type { Route } from "./+types/api.offers.refresh";
import { requireFamily } from "~/lib/auth";
import { offerRepository } from "~/data/repositories/offerRepository";
import { familyStoreSettingsRepository } from "~/data/repositories/familyStoreSettingsRepository";
import { EtilbudsavisOfferSource } from "~/adapters/offerSource/EtilbudsavisOfferSource";
import { STORE_NAMES } from "~/domain/stores";
import type { StoreId } from "~/domain/types";

/**
 * POST: fetch the family's selected stores' current offers automatically
 * from etilbudsavis.dk and replace each store's imported set.
 *
 * Each store is fetched independently via `Promise.allSettled` rather than
 * `Promise.all` — one store's 403/schema-drift (Netto having a bad day on
 * Tjek, say) must not block the others from refreshing, and the family
 * should see exactly which stores succeeded.
 */
export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const headers = new Headers();
  const family = await requireFamily(request, headers);
  const settings = await familyStoreSettingsRepository.get(family.id);

  const results = await Promise.allSettled(
    settings.selectedStores.map(async (storeId: StoreId) => {
      const offers = await new EtilbudsavisOfferSource(storeId).fetchCurrentOffers();
      await offerRepository.replaceCurrentOffers(family.id, storeId, offers, "etilbudsavis");
      return { storeId, count: offers.length };
    }),
  );

  const refreshed: { storeId: StoreId; count: number }[] = [];
  const failed: { storeId: StoreId; message: string }[] = [];
  results.forEach((result, i) => {
    const storeId = settings.selectedStores[i]!;
    if (result.status === "fulfilled") {
      refreshed.push(result.value);
    } else {
      const message = result.reason instanceof Error ? result.reason.message : "Unknown error";
      failed.push({ storeId, message });
    }
  });

  return new Response(
    JSON.stringify({
      ok: failed.length === 0,
      refreshed,
      failed,
      storeNames: STORE_NAMES,
    }),
    {
      status: refreshed.length > 0 || failed.length === 0 ? 200 : 502,
      headers: { ...Object.fromEntries(headers), "Content-Type": "application/json" },
    },
  );
}
