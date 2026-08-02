import type { Route } from "./+types/api.recipes.refresh";
import { requireFamily } from "~/lib/auth";
import { externalRecipeRepository } from "~/data/repositories/externalRecipeRepository";
import { RemaRecipeSource } from "~/adapters/recipeSource/RemaRecipeSource";

/** POST: re-scrape REMA 1000's own recipes (madogdrikke.rema1000.dk/opskrifter) into the cache. */
export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const headers = new Headers();
  await requireFamily(request, headers);

  try {
    const recipes = await new RemaRecipeSource().fetchRecipes();
    await externalRecipeRepository.replaceAll(recipes);
    return new Response(JSON.stringify({ ok: true, count: recipes.length }), {
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
