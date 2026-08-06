import type { Route } from "./+types/api.cron.offers-refresh";
import { familyRepository } from "~/data/repositories/familyRepository";
import { offerRepository } from "~/data/repositories/offerRepository";
import { EtilbudsavisOfferSource } from "~/adapters/offerSource/EtilbudsavisOfferSource";

/**
 * GET: scheduled weekly refresh of REMA 1000's offers, run by Vercel Cron
 * (see the `crons` entry in vercel.json) every Thursday morning — a few days
 * after REMA typically publishes next week's catalog, so families see it
 * without needing to press "Hent tilbud nu" themselves.
 *
 * There's no signed-in user on a cron invocation, so this isn't gated by
 * `requireFamily` — instead it's gated by the `CRON_SECRET` Vercel sets on
 * the `Authorization` header of its own cron requests, and it refreshes
 * every family in one run rather than needing a per-family trigger.
 */
export async function loader({ request }: Route.LoaderArgs) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("Authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  try {
    const offers = await new EtilbudsavisOfferSource().fetchCurrentOffers();
    const families = await familyRepository.listAll();

    await Promise.all(
      families.map((family) => offerRepository.replaceCurrentOffers(family.id, offers, "etilbudsavis")),
    );

    return new Response(JSON.stringify({ ok: true, families: families.length, offers: offers.length }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "fetch_failed",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }
}
