import type { Route } from "./+types/api.recipes";
import { requireUser } from "~/lib/auth";
import { externalRecipeRepository } from "~/data/repositories/externalRecipeRepository";

/** GET: all of REMA 1000's own cached recipes, unranked. */
export async function loader({ request }: Route.LoaderArgs) {
  const headers = new Headers();
  const user = await requireUser(request, headers);
  if (!user) throw new Response("Unauthorized", { status: 401 });

  const recipes = await externalRecipeRepository.listAll();

  return new Response(JSON.stringify(recipes), {
    headers: { ...Object.fromEntries(headers), "Content-Type": "application/json" },
  });
}
