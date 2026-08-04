import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseListingPage } from "~/adapters/recipeSource/remaListing";
import { resolveNuxtPayload } from "~/adapters/recipeSource/nuxtPayload";
import { buildListingHtml } from "~/adapters/recipeSource/__fixtures__/buildListingHtml";

/**
 * A reduced copy of a real `/opskrifter/aftensmad` response — see the comment
 * at the top of the fixture. The point of testing against a capture rather
 * than a hand-written page is that every previous version of this scraper
 * passed its synthetic tests and returned nothing from the live site.
 */
const LISTING_HTML = readFileSync(
  fileURLToPath(new URL("./__fixtures__/aftensmad-listing.html", import.meta.url)),
  "utf8",
);

describe("parseListingPage", () => {
  it("reads the theme's size and the page the server rendered", () => {
    const page = parseListingPage(LISTING_HTML);
    expect(page.totalItems).toBe(350);
    expect(page.currentPage).toBe(1);
  });

  it("returns every recipe card's full record from the page's payload", () => {
    const { recipes } = parseListingPage(LISTING_HTML);

    expect(recipes.map((r) => r.id)).toEqual([
      "smashed-tortilla-med-gris-og-kiwisalsa",
      "poke-bowl-med-blomkalsris-og-orredfilet",
    ]);

    const pokeBowl = recipes[1]!;
    expect(pokeBowl.title).toBe("Poke bowl med blomkålsris og ørredfilet");
    expect(pokeBowl.url).toBe(
      "https://madogdrikke.rema1000.dk/opskrifter/poke-bowl-med-blomkalsris-og-orredfilet",
    );
    expect(pokeBowl.imageUrl).toMatch(/^https:\/\/images\.ctfassets\.net\//);
    expect(pokeBowl.servings).toBe(4);
    expect(pokeBowl.instructions[0]).toMatch(/^Halver agurken/);
  });

  it("builds ingredient lines from amount, unit and name", () => {
    const { recipes } = parseListingPage(LISTING_HTML);
    expect(recipes[1]!.ingredients).toEqual([
      "600 g blomkålsris",
      "1 stk agurk",
      "2 stk avocado",
      "1 bundt radisser",
    ]);
  });

  it("keeps the theme tags, so dinner recipes stay distinguishable", () => {
    const { recipes } = parseListingPage(LISTING_HTML);
    expect(recipes[1]!.tags).toContain("aftensmad");
    expect(recipes[1]!.tags).toContain("fisk-og-skaldyr");
  });

  it("returns nothing rather than guessing when the payload is absent", () => {
    const page = parseListingPage("<html><body><h1>Aftensmad</h1></body></html>");
    expect(page.recipes).toEqual([]);
    expect(page.totalItems).toBeUndefined();
  });
});

describe("ingredient amounts", () => {
  /**
   * A zero amount is the site's "to taste" — salt, pepper, a drizzle of oil.
   * Printing it produced the `"0 salt"` lines in the current cache.
   */
  it("omits a zero amount instead of printing it", () => {
    const html = buildListingHtml({
      recipes: [
        {
          title: "Test",
          slug: "test",
          totalTime: 25,
          ingredients: [
            [400, "g", "hakket oksekød"],
            [0, "g", "salt"],
            [2.5, "dl", "fløde"],
          ],
        },
      ],
    });

    const { recipes } = parseListingPage(html);
    expect(recipes[0]!.ingredients).toEqual(["400 g hakket oksekød", "salt", "2.5 dl fløde"]);
    expect(recipes[0]!.totalTimeMinutes).toBe(25);
  });
});

describe("resolveNuxtPayload", () => {
  it("resolves references, and treats a number in a slot as that number", () => {
    // { count: 42, name: "x" } — index 1 holds the literal 42, not a reference.
    expect(resolveNuxtPayload([{ count: 1, name: 2 }, 42, "x"])).toEqual({ count: 42, name: "x" });
  });

  it("unwraps reactivity wrappers", () => {
    expect(resolveNuxtPayload([{ state: 1 }, ["Reactive", 2], { ok: 3 }, true])).toEqual({
      state: { ok: true },
    });
  });

  it("survives a cycle", () => {
    expect(resolveNuxtPayload([{ self: 0 }])).toEqual({ self: undefined });
  });
});
