import type { Route } from "./+types/api.recipes.import";
import { requireFamily } from "~/lib/auth";
import { externalRecipeRepository } from "~/data/repositories/externalRecipeRepository";
import { fetchRecipeFromUrl, UrlImportError } from "~/adapters/recipeSource/urlImport";

/**
 * POST: import one recipe from a URL the user pasted, fetched server-side and
 * run through the same schema.org/Recipe extraction pipeline as REMA's own
 * recipe cache. Stored with `externalRecipeRepository.upsert`, which touches
 * only this one row — unlike the REMA refresh action's `replaceAll`.
 */
export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const headers = new Headers();
  await requireFamily(request, headers);

  const body = await request.json().catch(() => null);
  const url = typeof body?.url === "string" ? body.url.trim() : "";
  if (!url) {
    return new Response(JSON.stringify({ error: "invalid_url", message: "A URL is required." }), {
      status: 400,
      headers: { ...Object.fromEntries(headers), "Content-Type": "application/json" },
    });
  }

  try {
    const recipe = await fetchRecipeFromUrl(url);
    await externalRecipeRepository.upsert(recipe);
    return new Response(JSON.stringify({ ok: true, recipe }), {
      headers: { ...Object.fromEntries(headers), "Content-Type": "application/json" },
    });
  } catch (error) {
    if (error instanceof UrlImportError) {
      return new Response(JSON.stringify({ error: error.code, message: error.message }), {
        status: error.code === "fetch_failed" ? 502 : 400,
        headers: { ...Object.fromEntries(headers), "Content-Type": "application/json" },
      });
    }
    throw error;
  }
}
