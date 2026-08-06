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

/** A stub `fetch` that answers by URL, and records what it was asked. */
function stubFetch(routes: { match: string; body: unknown; status?: number }[]) {
  const calls: string[] = [];
  const impl = vi.fn(async (input: Parameters<typeof fetch>[0]) => {
    const url = String(input);
    calls.push(url);
    const route = routes.find((candidate) => url.includes(candidate.match));
    if (!route) throw new Error(`unstubbed request: ${url}`);
    return new Response(JSON.stringify(route.body), {
      status: route.status ?? 200,
      headers: { "Content-Type": "application/json" },
    });
  });
  return { impl: impl as unknown as typeof fetch, calls };
}

function source(fetchImpl: typeof fetch) {
  return new FatSecretNutritionSource({ clientId: "id", clientSecret: "secret", fetchImpl });
}

describe("FatSecretNutritionSource.lookup", () => {
  it("resolves a term to per-100 g figures", async () => {
    const { impl } = stubFetch([
      { match: "connect/token", body: TOKEN_RESPONSE },
      { match: "foods.search", body: CHICKEN_SEARCH },
      { match: "food.get.v4", body: CHICKEN_FOOD },
    ]);

    const found = await source(impl).lookup("chicken breast");

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

    await client.lookup("chicken breast");
    await client.lookup("chicken breast");

    expect(calls.filter((url) => url.includes("connect/token"))).toHaveLength(1);
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
      { match: "foods.search", body: { foods: { total_results: "0" } } },
    ]);

    await expect(source(impl).lookup("frilandsgris")).resolves.toBeNull();
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

    await expect(source(impl).lookup("chicken breast")).resolves.toBeNull();
  });

  it("throws on an error body behind a 200, rather than reading it as a result", async () => {
    const { impl } = stubFetch([
      { match: "connect/token", body: TOKEN_RESPONSE },
      {
        match: "foods.search",
        body: { error: { code: 12, message: "Missing required oauth parameter" } },
      },
    ]);

    await expect(source(impl).lookup("chicken")).rejects.toThrow(/error 12/);
  });

  it("names the IP allowlist when the token request is refused", async () => {
    const { impl } = stubFetch([{ match: "connect/token", body: {}, status: 401 }]);

    await expect(source(impl).lookup("chicken")).rejects.toThrow(/allowlisted/);
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

    await expect(source(impl).lookup("chicken breast")).resolves.toMatchObject({ foodId: "4881" });
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
