import { describe, expect, it } from "vitest";
import { EtilbudsavisOfferSource } from "~/adapters/offerSource/EtilbudsavisOfferSource";

// Fixtures captured from live api.etilbudsavis.dk responses (fetched outside
// this project's dev sandbox, which gets 403'd by the API's bot protection —
// see the adapter's doc comment). Trimmed to the fields the adapter reads.
const DEALERS_RESPONSE = [{ id: "11deC", name: "REMA 1000" }];

const CATALOGS_RESPONSE = [{ id: "D1MF-6Qx", category_ids: ["groceries_discount"] }];

const OFFERS_RESPONSE = [
  {
    heading:
      "REMA 1000 Hakket dansk oksekød med 35% grønt, kyllingekød, grise- og kalvekød eller Frilandsgris skinkekød",
    run_from: "2026-08-01T22:00:00+0000",
    run_till: "2026-08-08T21:59:59+0000",
    pricing: { price: 29, pre_price: null, currency: "DKK" },
    quantity: { unit: { symbol: "g", si: { symbol: "kg", factor: 0.001 } }, size: { from: 400, to: 400 } },
  },
  {
    heading: "Coca-Cola eller Fanta",
    run_from: "2026-08-01T22:00:00+0000",
    run_till: "2026-08-08T21:59:59+0000",
    pricing: { price: 2.5, pre_price: null, currency: "DKK" },
    quantity: { unit: { symbol: "cl", si: { symbol: "l", factor: 0.01 } }, size: { from: 33, to: 33 } },
  },
  {
    heading: "REMA 1000 Dansk kyllingebrystfilet, -inderfilet eller hel kylling",
    run_from: "2026-08-01T22:00:00+0000",
    run_till: "2026-08-08T21:59:59+0000",
    pricing: { price: 49, pre_price: null, currency: "DKK" },
    quantity: { unit: { symbol: "g", si: { symbol: "kg", factor: 0.001 } }, size: { from: 600, to: 1350 } },
  },
];

function fakeFetch(): typeof fetch {
  return (async (input: Parameters<typeof fetch>[0]) => {
    const url = String(input);
    const body = url.includes("/dealers")
      ? DEALERS_RESPONSE
      : url.includes("/catalogs")
        ? CATALOGS_RESPONSE
        : url.includes("/offers")
          ? OFFERS_RESPONSE
          : [];
    return new Response(JSON.stringify(body), { status: 200 });
  }) as typeof fetch;
}

describe("EtilbudsavisOfferSource", () => {
  it("resolves REMA 1000's dealer id, current catalog, and maps offers to the reference schema", async () => {
    const source = new EtilbudsavisOfferSource("rema1000", fakeFetch());
    const offers = await source.fetchCurrentOffers();

    expect(offers).toHaveLength(3);

    // 29 DKK for 400g -> 72.50 DKK/kg, matching REMA's own "72.50 pr. kg" description.
    const beef = offers[0]!;
    expect(beef.name).toBe(
      "REMA 1000 Hakket dansk oksekød med 35% grønt, kyllingekød, grise- og kalvekød eller Frilandsgris skinkekød",
    );
    expect(beef.unitPrice).toBeCloseTo(72.5, 5);
    expect(beef.baseUnit).toBe("kilogram");
    expect(beef.departmentSlug).toBe("groceries_discount");
    expect(beef.currencyCode).toBe("DKK");
    expect(beef.validFrom).toBe("2026-08-01T22:00:00+0000");
    expect(beef.storeId).toBe("rema1000");
    expect(beef.memberOnly).toBe(false);

    const cola = offers[1]!;
    expect(cola.unitPrice).toBeCloseTo(2.5 / 0.33, 5);
    expect(cola.baseUnit).toBe("liter");

    const chicken = offers[2]!;
    expect(chicken.unitSizeFrom).toBe(600);
    expect(chicken.unitSizeTo).toBe(1350);
  });

  it("merges offers from both the current and the next catalog", async () => {
    const catalogsResponse = [
      { id: "NEXT-WEEK", category_ids: ["groceries_discount"] },
      { id: "THIS-WEEK", category_ids: ["groceries_discount"] },
    ];
    const offersByCatalog: Record<string, unknown[]> = {
      "NEXT-WEEK": [
        {
          heading: "Næste uges tilbud",
          run_from: "2026-08-08T22:00:00+0000",
          run_till: "2026-08-15T21:59:59+0000",
          pricing: { price: 10, currency: "DKK" },
          quantity: { unit: { symbol: "stk" }, size: { from: 1, to: 1 } },
        },
      ],
      "THIS-WEEK": OFFERS_RESPONSE,
    };

    const fetchImpl = (async (input: Parameters<typeof fetch>[0]) => {
      const url = String(input);
      if (url.includes("/dealers")) return new Response(JSON.stringify(DEALERS_RESPONSE), { status: 200 });
      if (url.includes("/catalogs")) return new Response(JSON.stringify(catalogsResponse), { status: 200 });
      const catalogId = url.includes("NEXT-WEEK") ? "NEXT-WEEK" : "THIS-WEEK";
      return new Response(JSON.stringify(offersByCatalog[catalogId]), { status: 200 });
    }) as typeof fetch;

    const source = new EtilbudsavisOfferSource("rema1000", fetchImpl);
    const offers = await source.fetchCurrentOffers();

    expect(offers).toHaveLength(4);
    expect(offers.some((o) => o.name === "Næste uges tilbud")).toBe(true);
    expect(offers.filter((o) => o.validFrom === "2026-08-01T22:00:00+0000")).toHaveLength(3);
  });

  it("throws a clear error when the dealer can't be resolved", async () => {
    const emptyFetch = (async () => new Response(JSON.stringify([]), { status: 200 })) as typeof fetch;
    const source = new EtilbudsavisOfferSource("rema1000", emptyFetch);
    await expect(source.fetchCurrentOffers()).rejects.toThrow(/could not resolve a REMA 1000 dealer id/);
  });

  it("resolves a different store's dealer and stamps its storeId onto the mapped offers", async () => {
    const nettoFetch = (async (input: Parameters<typeof fetch>[0]) => {
      const url = String(input);
      if (url.includes("/dealers")) {
        return new Response(JSON.stringify([{ id: "netto-id", name: "Netto" }]), { status: 200 });
      }
      if (url.includes("/catalogs")) return new Response(JSON.stringify(CATALOGS_RESPONSE), { status: 200 });
      return new Response(JSON.stringify(OFFERS_RESPONSE), { status: 200 });
    }) as typeof fetch;

    const source = new EtilbudsavisOfferSource("netto", nettoFetch);
    const offers = await source.fetchCurrentOffers();

    expect(offers.every((o) => o.storeId === "netto")).toBe(true);
  });

  it("reports the failing store by name when its dealer can't be resolved", async () => {
    const emptyFetch = (async () => new Response(JSON.stringify([]), { status: 200 })) as typeof fetch;
    const source = new EtilbudsavisOfferSource("netto", emptyFetch);
    await expect(source.fetchCurrentOffers()).rejects.toThrow(/could not resolve a Netto dealer id/);
  });
});
