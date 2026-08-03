import type { Route } from "./+types/api.recipes.$id";
import { requireUser } from "~/lib/auth";
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
