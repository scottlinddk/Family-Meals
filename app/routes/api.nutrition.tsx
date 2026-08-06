import type { Route } from "./+types/api.nutrition";
import { requireFamily } from "~/lib/auth";
import { externalRecipeRepository } from "~/data/repositories/externalRecipeRepository";
import { nutritionFactRepository } from "~/data/repositories/nutritionFactRepository";
import { FatSecretNutritionSource } from "~/adapters/nutritionSource/FatSecretNutritionSource";
import { lookupTerms } from "~/adapters/nutritionSource/lookupTerms";
import { ingredientTerms, type NutritionLanguage } from "~/domain/nutrition/ingredientTerms";

/**
 * How many new terms one refresh looks up.
 *
 * Each term is two FatSecret calls, and this runs as a serverless function
 * with a request timeout, so the whole vocabulary is deliberately *not* done
 * in one go: the first refresh fills the commonest few dozen terms, and
 * pressing the button again continues where it left off, because everything
 * already cached is skipped. That also keeps a rate-limited key from being
 * spent in a single click.
 */
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

/** GET: how much of the recipe cache's ingredient vocabulary has nutrition data. */
export async function loader({ request }: Route.LoaderArgs) {
  const headers = new Headers();
  await requireFamily(request, headers);

  const [recipes, facts] = await Promise.all([
    externalRecipeRepository.listAll(),
    nutritionFactRepository.listAll(),
  ]);

  const terms = ingredientTerms(recipes.flatMap((recipe) => recipe.ingredients), language());
  const known = new Set(facts.map((fact) => fact.term));

  return json(
    {
      configured: FatSecretNutritionSource.fromEnv() !== null,
      terms: terms.length,
      matched: facts.filter((fact) => fact.source === "fatsecret").length,
      unmatched: facts.filter((fact) => fact.source === "unmatched").length,
      missing: terms.filter((term) => !known.has(term.key)).length,
    },
    headers,
  );
}

/**
 * POST: look up the ingredient terms that have no cached nutrition yet.
 *
 * Incremental by design — terms already in `nutrition_facts` (matched *or*
 * recorded as a miss) are skipped, so this is safe to press repeatedly and
 * costs nothing once the vocabulary is covered.
 */
export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const headers = new Headers();
  await requireFamily(request, headers);

  const source = FatSecretNutritionSource.fromEnv();
  if (!source) {
    // Not an error the user can do anything about from the browser, and not a
    // crash either: the app keeps ranking dinners on the ingredient-line
    // calorie estimate. Say which is the case rather than failing silently.
    return json(
      {
        error: "not_configured",
        message:
          "FATSECRET_CLIENT_ID and FATSECRET_CLIENT_SECRET are not set, so nutrition data can't be " +
          "fetched. Calories fall back to the ingredient-line estimate.",
      },
      headers,
      501,
    );
  }

  const requested = Number(new URL(request.url).searchParams.get("limit"));
  const limit =
    Number.isFinite(requested) && requested > 0 ? Math.min(requested, MAX_LIMIT) : DEFAULT_LIMIT;

  const recipes = await externalRecipeRepository.listAll();
  const terms = ingredientTerms(recipes.flatMap((recipe) => recipe.ingredients), language());
  const known = await nutritionFactRepository.listKnownTerms(terms.map((term) => term.key));
  const pending = terms.filter((term) => !known.has(term.key));

  const batch = pending.slice(0, limit);
  const result = await lookupTerms(source, batch);
  await nutritionFactRepository.upsertMany(result.facts);

  return json(
    {
      ok: true,
      terms: terms.length,
      lookedUp: batch.length,
      matched: result.matched,
      unmatched: result.unmatched,
      remaining: pending.length - result.facts.length,
      // Surfaced rather than swallowed: a refresh that resolved 3 of 50
      // because the key isn't allowlisted should read as broken, not as a
      // vocabulary FatSecret happens not to know.
      failures: result.failures.slice(0, 5),
      failureCount: result.failures.length,
    },
    headers,
  );
}

/**
 * Which language terms are searched in — Danish only when the key is
 * provisioned for it, since an unlocalised key returns nothing for Danish
 * words. Read here so the refresh and the read path agree about cache keys.
 */
function language(): NutritionLanguage {
  return process.env.FATSECRET_LANGUAGE?.toLowerCase().startsWith("da") ? "da" : "en";
}

function json(body: unknown, headers: Headers, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...Object.fromEntries(headers), "Content-Type": "application/json" },
  });
}
