import { describe, expect, it, vi } from "vitest";
import {
  FatSecretNutritionSource,
  pickFood,
  type EnvLike,
} from "~/adapters/nutritionSource/FatSecretNutritionSource";
import { pickMetricServing, toNutrientsPer100g } from "~/adapters/nutritionSource/fatSecretSchema";

/**
 * Fixture tests, for the same reason `EtilbudsavisOfferSource` has them: the
 * FatSecret API can't be reached from this project's sandbox, and calling it
 * needs a key whose registered IP addresses this machine is not among. So the
 * responses below are the documented shapes — stringly-typed numbers, a bare
 * object where a one-element list would be, an error body behind an HTTP 200
 * — and the tests are about surviving them.
 */

const TOKEN_RESPONSE = { access_token: "token-abc", expires_in: 86400, token_type: "Bearer" };

const CHICKEN_SEARCH = {
  foods: {
    total_results: "2",
    food: [
      {
        food_id: "5555",
        food_name: "Crispy Chicken Strips",
        food_type: "Brand",
        brand_name: "Some Brand",
      },
      { food_id: "4881", food_name: "Chicken Breast", food_type: "Generic" },
    ],
  },
};

const CHICKEN_FOOD = {
  food: {
    food_id: "4881",
    food_name: "Chicken Breast",
    food_type: "Generic",
    servings: {
      serving: [
        // A serving with no metric amount, which can't be scaled to grams.
        { serving_id: "1", serving_description: "1 breast", calories: "284" },
        {
          serving_id: "2",
          serving_description: "100 g",
          metric_serving_amount: "100.000",
          metric_serving_unit: "g",
          calories: "165",
          protein: "31.02",
          fat: "3.57",
          carbohydrate: "0.00",
          saturated_fat: "1.01",
          sodium: "74",
        },
      ],
    },
  },
};

interface StubRoute {
  match: string;
  body?: unknown;
  /** Answered in order, one per matching call — for testing a retry. */
  bodies?: unknown[];
  status?: number;
  /** Applied to the first matching call only, so a downgrade can be tested. */
  firstStatus?: number;
}

/** A stub `fetch` that answers by URL, and records what it was asked. */
function stubFetch(routes: StubRoute[]) {
  const calls: { url: string; body: string }[] = [];
  const seen = new Map<StubRoute, number>();

  const impl = vi.fn(async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
    const url = String(input);
    calls.push({ url, body: String(init?.body ?? "") });

    const route = routes.find((candidate) => url.includes(candidate.match));
    if (!route) throw new Error(`unstubbed request: ${url}`);

    const nth = seen.get(route) ?? 0;
    seen.set(route, nth + 1);
    const body = route.bodies ? (route.bodies[Math.min(nth, route.bodies.length - 1)] ?? {}) : route.body;
    const status = nth === 0 && route.firstStatus ? route.firstStatus : (route.status ?? 200);

    return new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  });

  return { impl: impl as unknown as typeof fetch, calls };
}

/** Unlocalised: no region or language, the way a plain `basic` key behaves. */
function source(fetchImpl: typeof fetch) {
  return new FatSecretNutritionSource({ clientId: "id", clientSecret: "secret", fetchImpl });
}

/** What `fromEnv` builds: Danish region and language, `localization` scope. */
function danishSource(fetchImpl: typeof fetch) {
  return new FatSecretNutritionSource({
    clientId: "id",
    clientSecret: "secret",
    region: FatSecretNutritionSource.DEFAULT_REGION,
    language: FatSecretNutritionSource.DEFAULT_LANGUAGE,
    fetchImpl,
  });
}

const NO_RESULTS = { foods: { total_results: "0" } };

describe("FatSecretNutritionSource.lookup", () => {
  it("resolves a term to per-100 g figures", async () => {
    const { impl } = stubFetch([
      { match: "connect/token", body: TOKEN_RESPONSE },
      { match: "foods.search", body: CHICKEN_SEARCH },
      { match: "food.get.v4", body: CHICKEN_FOOD },
    ]);

    const found = await source(impl).lookup({ query: "chicken breast" });

    expect(found).not.toBeNull();
    expect(found!.foodId).toBe("4881");
    expect(found!.per100g.kcal).toBe(165);
    expect(found!.per100g.proteinG).toBeCloseTo(31.02);
    expect(found!.per100g.fatG).toBeCloseTo(3.57);
  });

  it("sends the token as a bearer, and asks for it only once per batch", async () => {
    const { impl, calls } = stubFetch([
      { match: "connect/token", body: TOKEN_RESPONSE },
      { match: "foods.search", body: CHICKEN_SEARCH },
      { match: "food.get.v4", body: CHICKEN_FOOD },
    ]);
    const client = source(impl);

    await client.lookup({ query: "chicken breast" });
    await client.lookup({ query: "chicken breast" });

    expect(calls.filter((call) => call.url.includes("connect/token"))).toHaveLength(1);
    const searchCall = (impl as unknown as ReturnType<typeof vi.fn>).mock.calls.find((call) =>
      String(call[0]).includes("foods.search"),
    )!;
    expect(searchCall[1]!.headers).toMatchObject({
      Authorization: "Bearer token-abc",
    });
  });

  it("is null — not an error — when nothing matches", async () => {
    const { impl } = stubFetch([
      { match: "connect/token", body: TOKEN_RESPONSE },
      { match: "foods.search", body: NO_RESULTS },
    ]);

    await expect(source(impl).lookup({ query: "frilandsgris" })).resolves.toBeNull();
  });

  it("is null when the matched food states no metric serving to scale from", async () => {
    const { impl } = stubFetch([
      { match: "connect/token", body: TOKEN_RESPONSE },
      { match: "foods.search", body: CHICKEN_SEARCH },
      {
        match: "food.get.v4",
        body: {
          food: {
            food_id: "4881",
            food_name: "Chicken Breast",
            servings: { serving: { serving_description: "1 breast", calories: "284" } },
          },
        },
      },
    ]);

    await expect(source(impl).lookup({ query: "chicken breast" })).resolves.toBeNull();
  });

  it("throws on an error body behind a 200, rather than reading it as a result", async () => {
    const { impl } = stubFetch([
      { match: "connect/token", body: TOKEN_RESPONSE },
      {
        match: "foods.search",
        body: { error: { code: 12, message: "Missing required oauth parameter" } },
      },
    ]);

    await expect(source(impl).lookup({ query: "chicken" })).rejects.toThrow(/error 12/);
  });

  it("names the IP allowlist when the token request is refused", async () => {
    const { impl } = stubFetch([{ match: "connect/token", body: {}, status: 401 }]);

    await expect(source(impl).lookup({ query: "chicken" })).rejects.toThrow(/allowlisted/);
  });

  it("accepts FatSecret's bare-object form of a one-element list", async () => {
    const { impl } = stubFetch([
      { match: "connect/token", body: TOKEN_RESPONSE },
      {
        match: "foods.search",
        body: {
          foods: {
            total_results: "1",
            food: { food_id: "4881", food_name: "Chicken Breast", food_type: "Generic" },
          },
        },
      },
      { match: "food.get.v4", body: CHICKEN_FOOD },
    ]);

    await expect(source(impl).lookup({ query: "chicken breast" })).resolves.toMatchObject({ foodId: "4881" });
  });
});

describe("localisation", () => {
  it("asks in Danish, for Danish food data", async () => {
    const { impl, calls } = stubFetch([
      { match: "connect/token", body: TOKEN_RESPONSE },
      { match: "foods.search", body: CHICKEN_SEARCH },
      { match: "food.get.v4", body: CHICKEN_FOOD },
    ]);

    await danishSource(impl).lookup({ query: "kyllingebryst", fallbackQuery: "chicken breast" });

    const token = calls.find((call) => call.url.includes("connect/token"))!;
    expect(token.body).toContain("scope=basic+localization");

    const search = calls.find((call) => call.url.includes("foods.search"))!;
    expect(search.url).toContain("region=DK");
    expect(search.url).toContain("language=da");
    expect(search.url).toContain("search_expression=kyllingebryst");
  });

  it("doesn't spend the English retry when the Danish term answers", async () => {
    const { impl, calls } = stubFetch([
      { match: "connect/token", body: TOKEN_RESPONSE },
      { match: "foods.search", body: CHICKEN_SEARCH },
      { match: "food.get.v4", body: CHICKEN_FOOD },
    ]);

    const found = await danishSource(impl).lookup({
      query: "kyllingebryst",
      fallbackQuery: "chicken breast",
    });

    expect(found!.query).toBe("kyllingebryst");
    expect(calls.filter((call) => call.url.includes("foods.search"))).toHaveLength(1);
  });

  it("retries in English when the Danish term finds nothing", async () => {
    const { impl, calls } = stubFetch([
      { match: "connect/token", body: TOKEN_RESPONSE },
      { match: "foods.search", bodies: [NO_RESULTS, CHICKEN_SEARCH] },
      { match: "food.get.v4", body: CHICKEN_FOOD },
    ]);

    const found = await danishSource(impl).lookup({
      query: "kyllingebryst",
      fallbackQuery: "chicken breast",
    });

    expect(found!.foodId).toBe("4881");
    // Recorded under the phrasing that actually found it, not the one asked first.
    expect(found!.query).toBe("chicken breast");
    const searches = calls.filter((call) => call.url.includes("foods.search"));
    expect(searches).toHaveLength(2);
    expect(searches[1]!.url).toContain("search_expression=chicken+breast");
  });

  it("gives up after the English retry rather than looping", async () => {
    const { impl, calls } = stubFetch([
      { match: "connect/token", body: TOKEN_RESPONSE },
      { match: "foods.search", body: NO_RESULTS },
    ]);

    await expect(
      danishSource(impl).lookup({ query: "frilandsgris", fallbackQuery: "free range pork" }),
    ).resolves.toBeNull();
    expect(calls.filter((call) => call.url.includes("foods.search"))).toHaveLength(2);
  });

  it("downgrades to the English database when the key has no localization scope", async () => {
    // FatSecret refuses the scope at the token endpoint with a 400.
    const { impl, calls } = stubFetch([
      { match: "connect/token", firstStatus: 400, body: TOKEN_RESPONSE },
      { match: "foods.search", body: CHICKEN_SEARCH },
      { match: "food.get.v4", body: CHICKEN_FOOD },
    ]);
    const client = danishSource(impl);

    await client.lookup({ query: "kyllingebryst", fallbackQuery: "chicken breast" });

    expect(client.isLocalized).toBe(false);
    const tokens = calls.filter((call) => call.url.includes("connect/token"));
    expect(tokens).toHaveLength(2);
    expect(tokens[1]!.body).toContain("scope=basic");
    expect(tokens[1]!.body).not.toContain("localization");
    // …and the region stops being sent, since it's what the key was refused for.
    expect(calls.find((call) => call.url.includes("foods.search"))!.url).not.toContain("region");
  });

  it("downgrades when an API call is rejected for carrying the region", async () => {
    const { impl, calls } = stubFetch([
      { match: "connect/token", body: TOKEN_RESPONSE },
      {
        match: "foods.search",
        bodies: [
          { error: { code: 21, message: "Invalid scope: localization is not enabled for this key" } },
          CHICKEN_SEARCH,
        ],
      },
      { match: "food.get.v4", body: CHICKEN_FOOD },
    ]);
    const client = danishSource(impl);

    const found = await client.lookup({ query: "kyllingebryst" });

    expect(found!.foodId).toBe("4881");
    expect(client.isLocalized).toBe(false);
    const searches = calls.filter((call) => call.url.includes("foods.search"));
    expect(searches[0]!.url).toContain("region=DK");
    expect(searches[1]!.url).not.toContain("region=DK");
  });

  it("still throws on an error that has nothing to do with localisation", async () => {
    const { impl } = stubFetch([
      { match: "connect/token", body: TOKEN_RESPONSE },
      { match: "foods.search", body: { error: { code: 5, message: "Daily limit exceeded" } } },
    ]);

    await expect(danishSource(impl).lookup({ query: "kyllingebryst" })).rejects.toThrow(
      /Daily limit exceeded/,
    );
  });
});

describe("FatSecretNutritionSource.fromEnv", () => {
  it("is null without credentials, so the app can carry on estimating", () => {
    expect(FatSecretNutritionSource.fromEnv({})).toBeNull();
    expect(
      FatSecretNutritionSource.fromEnv({ FATSECRET_CLIENT_ID: "id" }),
    ).toBeNull();
  });

  it("is a working source once both halves of the key are set", () => {
    const configured = FatSecretNutritionSource.fromEnv({
      FATSECRET_CLIENT_ID: "id",
      FATSECRET_CLIENT_SECRET: "secret",
    } satisfies EnvLike);
    expect(configured).toBeInstanceOf(FatSecretNutritionSource);
    // Danish without being asked: the app has no other locale worth defaulting to.
    expect(configured!.isLocalized).toBe(true);
  });
});

describe("pickFood", () => {
  const generic = { food_id: "1", food_name: "Chicken", food_type: "Generic" };
  const branded = { food_id: "2", food_name: "Chicken Strips", food_type: "Brand" };

  it("prefers the generic food an ingredient line means over a branded product", () => {
    expect(pickFood([branded, generic], "chicken")).toBe(generic);
  });

  it("prefers the closest name among generics", () => {
    const exact = { food_id: "3", food_name: "Onion", food_type: "Generic" };
    const other = { food_id: "4", food_name: "Onion Rings", food_type: "Generic" };
    expect(pickFood([other, exact], "onion")).toBe(exact);
  });

  it("falls back to the API's own ordering when nothing stands out", () => {
    expect(pickFood([branded, { ...branded, food_id: "9" }], "nothing alike")).toBe(branded);
  });
});

describe("pickMetricServing", () => {
  it("prefers an exact 100 g serving, which needs no scaling", () => {
    const hundred = { metric_serving_amount: 100, metric_serving_unit: "g", calories: 165 };
    const cup = { metric_serving_amount: 140, metric_serving_unit: "g", calories: 231 };
    expect(pickMetricServing([cup, hundred])).toBe(hundred);
  });

  it("otherwise takes the largest metric serving, where rounding matters least", () => {
    const small = { metric_serving_amount: 15, metric_serving_unit: "g", calories: 133 };
    const large = { metric_serving_amount: 240, metric_serving_unit: "ml", calories: 120 };
    expect(pickMetricServing([small, large])).toBe(large);
  });

  it("ignores servings that state no weight", () => {
    expect(pickMetricServing([{ serving_description: "1 breast", calories: 284 }])).toBeNull();
  });
});

describe("toNutrientsPer100g", () => {
  it("scales a non-100 g serving up to 100 g", () => {
    const per100g = toNutrientsPer100g({
      food_id: "1",
      food_name: "Olive Oil",
      servings: {
        serving: [
          {
            metric_serving_amount: 13.5,
            metric_serving_unit: "g",
            calories: 119,
            fat: 13.5,
            protein: 0,
            carbohydrate: 0,
          },
        ],
      },
    })!;

    expect(per100g.kcal).toBeCloseTo(881.5, 0);
    expect(per100g.fatG).toBeCloseTo(100, 0);
  });
});
