import type {
  FoodNutrition,
  NutritionQuery,
  NutritionSource,
} from "~/adapters/nutritionSource/NutritionSource";
import {
  fatSecretErrorSchema,
  foodGetSchema,
  foodsSearchSchema,
  toNutrientsPer100g,
  tokenResponseSchema,
  type FatSecretSearchFood,
} from "~/adapters/nutritionSource/fatSecretSchema";

/**
 * Nutrition from FatSecret's Platform API — the food database behind the
 * calories, protein and fat this app shows for REMA's recipes.
 *
 * REMA publishes no nutrition data with its recipes, so everything the app
 * knew about a dinner's calories was inferred from the ingredient lines
 * against a hand-written table (`calorieEstimate.ts`). That table was good
 * enough to *order* dinners and could never be more than that: it holds kcal
 * and nothing else, because protein and fat for 250 products is a nutrition
 * database, not a constant. This is that database.
 *
 * **Auth** is OAuth 2.0 client credentials (docs/guides/authentication/oauth2):
 * a token from `https://oauth.fatsecret.com/connect/token` with the key and
 * secret as HTTP Basic, scoped `basic`, then `Authorization: Bearer` on every
 * call. Tokens last a day; this holds one in memory and re-requests it a
 * minute before it expires, so a batch of 200 lookups costs one token
 * request rather than 200.
 *
 * **Localisation is the default, not an option.** The recipes are Danish, the
 * shop is Danish and the app is Danish, so every request carries
 * `region=DK&language=da` and the token asks for the `localization` scope
 * alongside `basic`. That is what makes FatSecret answer about `rugbrød`
 * rather than about the nearest American loaf, and what makes the entries
 * come back with metric servings. Both are overridable
 * (`FATSECRET_REGION`/`FATSECRET_LANGUAGE`), and a key that isn't provisioned
 * for the scope is *downgraded* rather than broken: the token request retries
 * without it, the region and language stop being sent, and lookups carry on
 * against the English database using the English names in
 * `ingredientTerms.ts`.
 *
 * **Lookups are two calls**: `foods.search` to resolve a term to a food id,
 * then `food.get.v4` for that id's full servings. The search response carries
 * a prose `food_description` ("Per 100g - Calories: 165kcal | Fat: 3.57g...")
 * that is tempting to parse instead, but it states whatever serving the entry
 * is built around and omits most nutrients; `food.get` returns the structured
 * `servings` this needs to normalise anything to per 100 g. A Danish term
 * that finds nothing is retried in English, so an unlocalised key and a gap
 * in the Danish data cost a call rather than a whole ingredient. Every result
 * is cached in Postgres afterwards (`nutritionFactRepository`), so a term
 * costs its calls once and none thereafter.
 *
 * **The IP allowlist is the operational catch.** FatSecret restricts token
 * requests to the IP addresses registered against the key, which a serverless
 * deployment does not have a stable set of. See README — the refresh endpoint
 * is designed to be run from wherever those addresses are, and the app works
 * without it.
 */
export class FatSecretNutritionSource implements NutritionSource {
  private static readonly TOKEN_URL = "https://oauth.fatsecret.com/connect/token";
  private static readonly API_URL = "https://platform.fatsecret.com/rest/server.api";
  /** How many search hits to consider before picking one. */
  private static readonly SEARCH_RESULTS = 5;
  /** Re-request a token this long before it expires, rather than on a 401. */
  private static readonly TOKEN_SKEW_MS = 60_000;
  /** The app is a Danish grocer's meal planner — see `app/i18n/locale.ts`. */
  static readonly DEFAULT_REGION = "DK";
  static readonly DEFAULT_LANGUAGE = "da";

  private token: { value: string; expiresAt: number } | null = null;

  /**
   * Whether this key turned out to have the `localization` scope. Starts
   * optimistic and is only ever turned off — by a token request that the
   * scope was refused for, or by an API call rejected for carrying the
   * region and language. Sticky for the life of the source, so one refused
   * request costs one retry rather than one per term.
   */
  private localized = true;

  constructor(private readonly config: FatSecretConfig) {}

  /**
   * Reads the credentials from the environment, or returns null when they
   * aren't set — the signal every caller uses to carry on with the local
   * calorie estimate instead of failing. Nutrition is an enrichment, and an
   * app that won't show a meal plan without a FatSecret key would be worse
   * than one that shows kcal only.
   */
  static fromEnv(env: EnvLike = process.env): FatSecretNutritionSource | null {
    const clientId = env.FATSECRET_CLIENT_ID;
    const clientSecret = env.FATSECRET_CLIENT_SECRET;
    if (!clientId || !clientSecret) return null;

    return new FatSecretNutritionSource({
      clientId,
      clientSecret,
      // Danish by default — the whole app is. Overridable for a key
      // provisioned for somewhere else, and dropped automatically if the key
      // has no `localization` scope to spend.
      region: env.FATSECRET_REGION || FatSecretNutritionSource.DEFAULT_REGION,
      language: env.FATSECRET_LANGUAGE || FatSecretNutritionSource.DEFAULT_LANGUAGE,
      // An outbound proxy with a stable address, for the IP allowlist above.
      tokenUrl: env.FATSECRET_TOKEN_URL || undefined,
      apiUrl: env.FATSECRET_API_URL || undefined,
    });
  }

  /**
   * Asks in Danish, then in English.
   *
   * The retry is not a hedge against bad Danish — it is what makes the same
   * code work on a key with the `localization` scope and one without. On a
   * localised key the Danish term usually answers and the English name is
   * never sent; on an unlocalised one the Danish term finds nothing and the
   * English name does the work.
   */
  async lookup({ query, fallbackQuery }: NutritionQuery): Promise<FoodNutrition | null> {
    const found = await this.lookupOne(query);
    if (found || !fallbackQuery || fallbackQuery === query) return found;
    return this.lookupOne(fallbackQuery);
  }

  private async lookupOne(term: string): Promise<FoodNutrition | null> {
    const candidates = await this.search(term);
    const chosen = pickFood(candidates, term);
    if (!chosen) return null;

    const food = await this.getFood(chosen.food_id);
    const per100g = toNutrientsPer100g(food);
    // A match with no metric serving can't be scaled to an ingredient line's
    // grams; that's a miss, not a failure (see `NutritionSource`).
    if (!per100g) return null;

    return { foodId: food.food_id, foodName: food.food_name, query: term, per100g };
  }

  private async search(term: string): Promise<FatSecretSearchFood[]> {
    const body = await this.call({
      method: "foods.search",
      search_expression: term,
      max_results: String(FatSecretNutritionSource.SEARCH_RESULTS),
    });
    const parsed = foodsSearchSchema.safeParse(body);
    if (!parsed.success) {
      throw new Error(`FatSecret: unexpected foods.search response: ${parsed.error.message}`);
    }
    return parsed.data.foods.food ?? [];
  }

  private async getFood(foodId: string) {
    const body = await this.call({ method: "food.get.v4", food_id: foodId });
    const parsed = foodGetSchema.safeParse(body);
    if (!parsed.success) {
      throw new Error(`FatSecret: unexpected food.get response: ${parsed.error.message}`);
    }
    return parsed.data.food;
  }

  private async call(params: Record<string, string>): Promise<unknown> {
    const body = await this.request(params);

    // An API error arrives with a 200 (see `fatSecretSchema.ts`), so the body
    // has to be checked before it's read as a result.
    const error = fatSecretErrorSchema.safeParse(body);
    if (!error.success) return body;

    const message = error.data.error.message ?? "no message";
    /*
     * A key without the `localization` scope is rejected for *asking* about a
     * region, not for the question itself. Drop the localisation and ask
     * again — once, and permanently for this source — rather than failing
     * every term on a key that can still answer in English.
     */
    if (this.localized && mentionsLocalization(message)) {
      this.localized = false;
      this.token = null;
      return this.request(params);
    }

    throw new Error(
      `FatSecret: ${params.method} returned error ${error.data.error.code ?? "?"}: ${message}`,
    );
  }

  private async request(params: Record<string, string>): Promise<unknown> {
    const token = await this.accessToken();
    const url = new URL(this.config.apiUrl ?? FatSecretNutritionSource.API_URL);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
    url.searchParams.set("format", "json");
    // Danish food data, for a Danish recipe — dropped only if this key turned
    // out to have no `localization` scope to spend.
    if (this.localized && this.config.region) url.searchParams.set("region", this.config.region);
    if (this.localized && this.config.language) {
      url.searchParams.set("language", this.config.language);
    }

    const init: FetchInit = { headers: { Authorization: `Bearer ${token}` } };
    const res = await (this.config.fetchImpl?.(url.toString(), init) ?? fetch(url.toString(), init));

    if (!res.ok) {
      throw new Error(`FatSecret: ${params.method} failed (${res.status})`);
    }
    return res.json();
  }

  /** The cached bearer token, requesting a new one when it's gone or about to. */
  private async accessToken(): Promise<string> {
    if (this.token && Date.now() < this.token.expiresAt) return this.token.value;

    const url = this.config.tokenUrl ?? FatSecretNutritionSource.TOKEN_URL;
    const basic = base64(`${this.config.clientId}:${this.config.clientSecret}`);
    const init: FetchInit = {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ grant_type: "client_credentials", scope: this.scopes() }),
    };
    const res = await (this.config.fetchImpl?.(url, init) ?? fetch(url, init));

    if (!res.ok) {
      /*
       * A 400 from the token endpoint is how an unprovisioned key refuses the
       * `localization` scope (`invalid_scope`). That is worth one retry
       * without it — the key can still answer in English — whereas a 401 is
       * about who is asking and no scope change will fix it.
       */
      if (this.localized && res.status === 400) {
        this.localized = false;
        return this.accessToken();
      }
      // 401 here is nearly always the IP allowlist rather than a bad secret,
      // so say so — it is the single most common way this integration fails.
      const hint =
        res.status === 401 || res.status === 403
          ? " — check the key/secret and that this server's IP is allowlisted in the FatSecret console"
          : "";
      throw new Error(`FatSecret: token request failed (${res.status})${hint}`);
    }

    const parsed = tokenResponseSchema.safeParse(await res.json());
    if (!parsed.success) {
      throw new Error(`FatSecret: unexpected token response: ${parsed.error.message}`);
    }

    const lifetimeMs = (parsed.data.expires_in ?? 86_400) * 1000;
    this.token = {
      value: parsed.data.access_token,
      expiresAt: Date.now() + Math.max(0, lifetimeMs - FatSecretNutritionSource.TOKEN_SKEW_MS),
    };
    return this.token.value;
  }

  /**
   * `localization` is asked for up front — Danish food data is the point —
   * and dropped only once this key has demonstrably refused it.
   */
  private scopes(): string {
    const localizable = this.localized && (this.config.region || this.config.language);
    return localizable ? "basic localization" : "basic";
  }

  /** Whether this source is still asking FatSecret for Danish food data. */
  get isLocalized(): boolean {
    return this.localized;
  }
}

/**
 * Whether an API error is FatSecret objecting to the region/language rather
 * than to the question.
 *
 * Matched on the message because the error *codes* for scope problems aren't
 * documented stably enough to branch on, and a wrong guess here would turn a
 * recoverable downgrade into a hard failure. The match is deliberately narrow:
 * anything it doesn't recognise is thrown, which is the safe direction.
 */
function mentionsLocalization(message: string): boolean {
  return /\b(scope|region|language|localization|localisation)\b/i.test(message);
}

/** Just the environment variables this reads — `process.env` satisfies it. */
export type EnvLike = Record<string, string | undefined>;

/** `fetch`'s own options type, without naming a DOM global. */
type FetchInit = NonNullable<Parameters<typeof fetch>[1]>;

export interface FatSecretConfig {
  clientId: string;
  clientSecret: string;
  /** ISO country code — "DK" via `fromEnv`. Needs the `localization` scope. */
  region?: string;
  /** ISO language code — "da" via `fromEnv`. Needs the `localization` scope. */
  language?: string;
  tokenUrl?: string;
  apiUrl?: string;
  fetchImpl?: typeof fetch;
}

/**
 * Which of the search hits an ingredient line means.
 *
 * An ingredient line says "kylling", and what it means is chicken — not
 * *Tyson Crispy Chicken Strips*, which is what a plain "first result" rule
 * returns often enough to matter. So: generic entries before branded ones,
 * then the closest name to the term searched for, then FatSecret's own
 * ordering. The comparison is deliberately crude (exact name, then prefix,
 * then anything) because the term is already a normalised product word by the
 * time it gets here — see `ingredientTerms.ts`.
 */
export function pickFood(
  candidates: FatSecretSearchFood[],
  term: string,
): FatSecretSearchFood | undefined {
  const wanted = term.trim().toLowerCase();

  const scored = candidates.map((food, index) => {
    const name = food.food_name.trim().toLowerCase();
    const generic = (food.food_type ?? "").toLowerCase() === "generic";
    const nameScore = name === wanted ? 2 : name.startsWith(wanted) || name.includes(wanted) ? 1 : 0;
    return { food, index, rank: (generic ? 10 : 0) + nameScore };
  });

  scored.sort((a, b) => b.rank - a.rank || a.index - b.index);
  return scored[0]?.food;
}

/** Base64 without assuming a DOM (`btoa`) or a Node global (`Buffer`) is present. */
function base64(value: string): string {
  if (typeof Buffer !== "undefined") return Buffer.from(value, "utf8").toString("base64");
  return btoa(value);
}
