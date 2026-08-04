import type { Route } from "./+types/api.offers.refresh";
import { requireFamily } from "~/lib/auth";
import { offerRepository } from "~/data/repositories/offerRepository";
import { EtilbudsavisOfferSource } from "~/adapters/offerSource/EtilbudsavisOfferSource";

/** POST: fetch REMA 1000's current offers automatically from etilbudsavis.dk and replace the imported set. */
export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const headers = new Headers();
  const family = await requireFamily(request, headers);

  try {
    const offers = await new EtilbudsavisOfferSource().fetchCurrentOffers();
    await offerRepository.replaceCurrentOffers(family.id, offers, "etilbudsavis");
    return new Response(JSON.stringify({ ok: true, count: offers.length }), {
      headers: { ...Object.fromEntries(headers), "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "fetch_failed",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 502, headers: { ...Object.fromEntries(headers), "Content-Type": "application/json" } },
    );
  }
}
