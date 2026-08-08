import type { Route } from "./+types/api.recipes.refresh";
import { requireFamily } from "~/lib/auth";
import { externalRecipeRepository } from "~/data/repositories/externalRecipeRepository";
import { RemaRecipeSource, summarizeExtraction } from "~/adapters/recipeSource/RemaRecipeSource";

/** POST: re-scrape REMA 1000's own recipes (madogdrikke.rema1000.dk/opskrifter) into the cache. */
export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const headers = new Headers();

  try {
    await requireFamily(request, headers);
    const { recipes, stats } = await new RemaRecipeSource().crawl();
    await externalRecipeRepository.replaceForSource("rema1000", recipes);

    // Report extraction health, not just a row count: a scrape that stores
    // recipes with no ingredients silently disables offer matching, and
    // previously still reported a plain success. `stats` adds the crawl's own
    // account of itself — how many pages it walked, against the total the
    // theme listing claims, plus any page it had to skip — so a crawl that
    // brings back 60 of 350 recipes says so.
    const summary = summarizeExtraction(recipes);
    return new Response(JSON.stringify({ ok: true, count: recipes.length, ...summary, themes: stats }), {
      headers: { ...Object.fromEntries(headers), "Content-Type": "application/json" },
    });
  } catch (error) {
    if (error instanceof Response) throw error;
    return new Response(
      JSON.stringify({
        error: "fetch_failed",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 502, headers: { ...Object.fromEntries(headers), "Content-Type": "application/json" } },
    );
  }
}
