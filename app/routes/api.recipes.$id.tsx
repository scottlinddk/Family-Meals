import type { Route } from "./+types/api.recipes.$id";
import { requireUser, requireFamily } from "~/lib/auth";
import { externalRecipeRepository } from "~/data/repositories/externalRecipeRepository";

/** GET: a single REMA 1000 recipe by id (404 if not cached). */
export async function loader({ request, params }: Route.LoaderArgs) {
  const headers = new Headers();
  const user = await requireUser(request, headers);
  if (!user) throw new Response("Unauthorized", { status: 401 });

  const recipe = await externalRecipeRepository.getById(params.id!);
  if (!recipe) throw new Response("Not found", { status: 404 });

  return new Response(JSON.stringify(recipe), {
    headers: { ...Object.fromEntries(headers), "Content-Type": "application/json" },
  });
}

/**
 * DELETE: removes a URL-imported recipe. Refuses to touch REMA 1000's own
 * scraped catalog (`source === "rema1000"`) — that's repopulated by the
 * refresh action, not something a family should be able to delete by id.
 */
export async function action({ request, params }: Route.ActionArgs) {
  if (request.method !== "DELETE") {
    return new Response("Method not allowed", { status: 405 });
  }

  const headers = new Headers();
  await requireFamily(request, headers);
  const jsonHeaders = { ...Object.fromEntries(headers), "Content-Type": "application/json" };

  const id = params.id!;
  const recipe = await externalRecipeRepository.getById(id);
  if (!recipe) {
    return new Response(JSON.stringify({ error: "not_found", message: "Recipe not found." }), {
      status: 404,
      headers: jsonHeaders,
    });
  }
  if (recipe.source === "rema1000") {
    return new Response(
      JSON.stringify({ error: "not_deletable", message: "REMA 1000's own recipes can't be deleted." }),
      { status: 403, headers: jsonHeaders },
    );
  }

  await externalRecipeRepository.remove(id);
  return new Response(JSON.stringify({ ok: true }), { headers: jsonHeaders });
}
