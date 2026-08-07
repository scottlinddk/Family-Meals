import type { Route } from "./+types/api.cron.offers-refresh";
import { familyRepository } from "~/data/repositories/familyRepository";
import { offerRepository } from "~/data/repositories/offerRepository";
import { familyStoreSettingsRepository } from "~/data/repositories/familyStoreSettingsRepository";
import { EtilbudsavisOfferSource } from "~/adapters/offerSource/EtilbudsavisOfferSource";
import { STORE_IDS, type Offer, type StoreId } from "~/domain/types";

/**
 * GET: scheduled weekly refresh of every supported store's offers, run by
 * Vercel Cron (see the `crons` entry in vercel.json) every Thursday morning
 * — a few days after chains typically publish next week's catalog, so
 * families see it without needing to press "Hent tilbud nu" themselves.
 *
 * There's no signed-in user on a cron invocation, so this isn't gated by
 * `requireFamily` — instead it's gated by the `CRON_SECRET` Vercel sets on
 * the `Authorization` header of its own cron requests.
 *
 * Each of the four stores is fetched exactly once — Tjek's catalogs aren't
 * family-specific, so fetching per family would be wasted, repeated work —
 * then applied only to the families that have that store selected. This
 * keeps the outbound request count at 4 regardless of family count, and one
 * store's fetch failing doesn't block the others or any family's other
 * stores.
 */
export async function loader({ request }: Route.LoaderArgs) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("Authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  const families = await familyRepository.listAll();
  const settingsByFamily = new Map(
    await Promise.all(
      families.map(async (family) => [family.id, await familyStoreSettingsRepository.get(family.id)] as const),
    ),
  );

  const storeResults = await Promise.allSettled(
    STORE_IDS.map(async (storeId) => ({
      storeId,
      offers: await new EtilbudsavisOfferSource(storeId).fetchCurrentOffers(),
    })),
  );

  const offersByStore = new Map<StoreId, Offer[]>();
  const storeErrors: { storeId: StoreId; message: string }[] = [];
  storeResults.forEach((result, i) => {
    const storeId = STORE_IDS[i]!;
    if (result.status === "fulfilled") {
      offersByStore.set(storeId, result.value.offers);
    } else {
      storeErrors.push({
        storeId,
        message: result.reason instanceof Error ? result.reason.message : "Unknown error",
      });
    }
  });

  let applied = 0;
  await Promise.all(
    families.map(async (family) => {
      const selectedStores = settingsByFamily.get(family.id)?.selectedStores ?? [];
      await Promise.all(
        selectedStores.map(async (storeId) => {
          const offers = offersByStore.get(storeId);
          if (!offers) return; // that store's fetch failed; leave the family's last-good snapshot in place
          await offerRepository.replaceCurrentOffers(family.id, storeId, offers, "etilbudsavis");
          applied++;
        }),
      );
    }),
  );

  return new Response(
    JSON.stringify({
      ok: storeErrors.length === 0,
      families: families.length,
      storesFetched: [...offersByStore.keys()],
      storeErrors,
      applied,
    }),
    { headers: { "Content-Type": "application/json" } },
  );
}
