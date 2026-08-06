import type { Route } from "./+types/api.recipes.suggestions";
import { requireFamily } from "~/lib/auth";
import { offerRepository } from "~/data/repositories/offerRepository";
import { externalRecipeRepository } from "~/data/repositories/externalRecipeRepository";
import { isSuggestionSort, rankRecipeSuggestions } from "~/domain/recipes/suggestionRanking";

/**
 * How many suggestions a request gets by default.
 *
 * The endpoint used to return the whole cache — 350 recipes, each with its
 * matched-ingredient list — as "suggestions", and the panel rendered every
 * one. A suggestion list you scroll for a minute isn't suggesting anything;
 * the ranking's job is to make the top of the list the answer.
 */
const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 100;

/**
 * GET: REMA 1000's own recipes, ranked for this family's week.
 *
 * `sort` picks which signal leads — offer overlap, calories per serving, or
 * the balanced default — and `vegetarian=1` drops meat dishes altogether. See
 * `suggestionRanking.ts` for what each one weighs. The ranking stays on the
 * server, so the browser gets a list rather than the whole recipe cache plus
 * the logic to sort it.
 */
export async function loader({ request }: Route.LoaderArgs) {
  const headers = new Headers();
  const family = await requireFamily(request, headers);

  const params = new URL(request.url).searchParams;
  const sort = params.get("sort");
  const limit = Number(params.get("limit"));

  const [offers, recipes] = await Promise.all([
    offerRepository.listCurrentOffers(family.id),
    externalRecipeRepository.listAll(),
  ]);

  const ranked = rankRecipeSuggestions(recipes, offers, {
    sort: isSuggestionSort(sort) ? sort : "balanced",
    vegetarianOnly: params.get("vegetarian") === "1",
    limit: Number.isFinite(limit) && limit > 0 ? Math.min(limit, MAX_LIMIT) : DEFAULT_LIMIT,
  });

  return new Response(JSON.stringify(ranked), {
    headers: { ...Object.fromEntries(headers), "Content-Type": "application/json" },
  });
}
