import type { Route } from "./+types/api.recipes.diagnose";
import { requireFamily } from "~/lib/auth";
import { RemaRecipeSource } from "~/adapters/recipeSource/RemaRecipeSource";
import { diagnoseRecipeHtml } from "~/adapters/recipeSource/scrapeDiagnostics";

/**
 * GET (optionally `?url=<recipe page>`): reports what a REMA recipe page
 * actually contains.
 *
 * madogdrikke.rema1000.dk blocks non-browser clients from the development
 * sandbox, so extraction strategies can only be matched to the real markup
 * from a deployed environment, where the fetch succeeds. Read-only and
 * behind the same family auth as the rest of the API.
 */
export async function loader({ request }: Route.LoaderArgs) {
  const headers = new Headers();
  await requireFamily(request, headers);

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body, null, 2), {
      status,
      headers: { ...Object.fromEntries(headers), "Content-Type": "application/json" },
    });

  try {
    const source = new RemaRecipeSource();
    const requested = new URL(request.url).searchParams.get("url");

    // Default to the first recipe the listing links to, so the endpoint is
    // useful without knowing a URL up front.
    let target = requested;
    if (!target) {
      const links = await source.fetchRecipeLinks();
      target = links[0] ?? null;
      if (!target) {
        return json({ error: "no_recipe_links", message: "The listing page exposed no recipe links." }, 502);
      }
    }

    if (!target.startsWith("https://madogdrikke.rema1000.dk/")) {
      return json({ error: "invalid_url", message: "Only madogdrikke.rema1000.dk URLs can be diagnosed." }, 400);
    }

    const res = await fetch(target);
    const html = await res.text();
    return json(diagnoseRecipeHtml(html, target, res.status));
  } catch (error) {
    if (error instanceof Response) throw error;
    return json(
      { error: "diagnose_failed", message: error instanceof Error ? error.message : "Unknown error" },
      502,
    );
  }
}
