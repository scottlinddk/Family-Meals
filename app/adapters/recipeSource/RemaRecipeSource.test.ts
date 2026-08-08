import { describe, expect, it } from "vitest";
import {
  extractRecipeLinks,
  parseRecipeDetail,
  RemaRecipeSource,
  summarizeExtraction,
} from "~/adapters/recipeSource/RemaRecipeSource";
import { buildListingHtml, type FixtureRecipe } from "~/adapters/recipeSource/__fixtures__/buildListingHtml";

const LISTING_HTML = `
<html><body>
  <nav><a href="/opskrifter">Alle opskrifter</a></nav>
  <ul>
    <li><a href="/opskrifter/kylling-i-karry">Kylling i karry</a></li>
    <li><a href="/opskrifter/laks-med-broccoli?utm_source=x">Laks med broccoli</a></li>
    <li><a href="https://madogdrikke.rema1000.dk/opskrifter/kylling-i-karry">duplicate</a></li>
  </ul>
</body></html>
`;

const DETAIL_HTML = `
<html><body>
  <head><meta property="og:image" content="https://cdn.example/kylling.jpg" /></head>
  <h1>Kylling i karry</h1>
  <h2>Ingredienser</h2>
  <ul>
    <li>500 g kyllingebryst</li>
    <li>1 dåse kokosmælk</li>
    <li>2 spsk karry</li>
  </ul>
</body></html>
`;

describe("extractRecipeLinks", () => {
  it("returns unique absolute recipe URLs, excluding the index page and query strings", () => {
    const links = extractRecipeLinks(LISTING_HTML);
    expect(links).toEqual([
      "https://madogdrikke.rema1000.dk/opskrifter/kylling-i-karry",
      "https://madogdrikke.rema1000.dk/opskrifter/laks-med-broccoli",
    ]);
  });
});

describe("parseRecipeDetail", () => {
  it("extracts title, image, and ingredients via the heading-fallback selector", () => {
    const recipe = parseRecipeDetail(
      DETAIL_HTML,
      "https://madogdrikke.rema1000.dk/opskrifter/kylling-i-karry",
    );
    expect(recipe).toEqual({
      id: "kylling-i-karry",
      title: "Kylling i karry",
      source: "rema1000",
      url: "https://madogdrikke.rema1000.dk/opskrifter/kylling-i-karry",
      imageUrl: "https://cdn.example/kylling.jpg",
      description: undefined,
      ingredients: ["500 g kyllingebryst", "1 dåse kokosmælk", "2 spsk karry"],
      instructions: [],
      servings: undefined,
      totalTimeMinutes: undefined,
      prepTimeMinutes: undefined,
      cookTimeMinutes: undefined,
    });
  });

  it("returns null when the page has no <h1>", () => {
    expect(parseRecipeDetail("<html><body>no title</body></html>", "https://x/opskrifter/y")).toBeNull();
  });

  it("extracts instructions, description, servings, and total time via heading/meta fallbacks", () => {
    const html = `
      <html><body>
        <head>
          <meta property="og:image" content="https://cdn.example/kylling.jpg" />
          <meta property="og:description" content="En hurtig og lækker karryret." />
        </head>
        <h1>Kylling i karry</h1>
        <p class="portioner">4 personer</p>
        <p class="tilberedningstid">30 minutter</p>
        <h2>Ingredienser</h2>
        <ul>
          <li>500 g kyllingebryst</li>
        </ul>
        <h2>Fremgangsmåde</h2>
        <ol>
          <li>Skær kyllingen i tern.</li>
          <li>Steg kyllingen gylden.</li>
          <li>Tilsæt karry og kokosmælk, og lad simre 10 min.</li>
        </ol>
      </body></html>
    `;

    const recipe = parseRecipeDetail(html, "https://madogdrikke.rema1000.dk/opskrifter/kylling-i-karry");

    expect(recipe?.description).toBe("En hurtig og lækker karryret.");
    expect(recipe?.instructions).toEqual([
      "Skær kyllingen i tern.",
      "Steg kyllingen gylden.",
      "Tilsæt karry og kokosmælk, og lad simre 10 min.",
    ]);
    expect(recipe?.servings).toBe(4);
    expect(recipe?.totalTimeMinutes).toBe(30);
  });
});

describe("parseRecipeDetail via schema.org JSON-LD", () => {
  /**
   * The primary extraction path. The class-name heuristics above never matched
   * the live markup, which cached 40 recipes with zero ingredients and
   * silently disabled offer matching entirely.
   */
  const jsonLdPage = (recipeJson: unknown, body = "<h1>Fallback titel</h1>") => `
    <html><head>
      <script type="application/ld+json">${JSON.stringify(recipeJson)}</script>
    </head><body>${body}</body></html>
  `;

  it("prefers JSON-LD over the DOM heuristics", () => {
    const html = jsonLdPage({
      "@context": "https://schema.org",
      "@type": "Recipe",
      name: "Kylling i karry",
      description: "En hurtig karryret.",
      image: "https://cdn.example/kylling.jpg",
      recipeIngredient: ["500 g kyllingebryst", "1 dåse kokosmælk"],
      recipeInstructions: [
        { "@type": "HowToStep", text: "Skær kyllingen i tern." },
        { "@type": "HowToStep", text: "Steg den gylden." },
      ],
      recipeYield: "4 personer",
      totalTime: "PT35M",
    });

    const recipe = parseRecipeDetail(html, "https://madogdrikke.rema1000.dk/opskrifter/kylling-i-karry");

    expect(recipe).toEqual({
      id: "kylling-i-karry",
      title: "Kylling i karry",
      source: "rema1000",
      url: "https://madogdrikke.rema1000.dk/opskrifter/kylling-i-karry",
      imageUrl: "https://cdn.example/kylling.jpg",
      description: "En hurtig karryret.",
      ingredients: ["500 g kyllingebryst", "1 dåse kokosmælk"],
      instructions: ["Skær kyllingen i tern.", "Steg den gylden."],
      servings: 4,
      totalTimeMinutes: 35,
    });
  });

  it("finds a Recipe nested inside an @graph wrapper", () => {
    const html = jsonLdPage({
      "@context": "https://schema.org",
      "@graph": [
        { "@type": "WebPage", name: "Ikke opskriften" },
        { "@type": ["Recipe"], name: "Laks", recipeIngredient: ["2 laksefileter"] },
      ],
    });

    const recipe = parseRecipeDetail(html, "https://x/opskrifter/laks");
    expect(recipe?.title).toBe("Laks");
    expect(recipe?.ingredients).toEqual(["2 laksefileter"]);
  });

  it("flattens HowToSection steps and sums prep + cook time", () => {
    const html = jsonLdPage({
      "@type": "Recipe",
      name: "Gryderet",
      recipeInstructions: [
        {
          "@type": "HowToSection",
          name: "Forberedelse",
          itemListElement: [{ "@type": "HowToStep", text: "Snit løgene." }],
        },
        {
          "@type": "HowToSection",
          itemListElement: [{ "@type": "HowToStep", text: "Lad simre en time." }],
        },
      ],
      prepTime: "PT15M",
      cookTime: "PT1H",
    });

    const recipe = parseRecipeDetail(html, "https://x/opskrifter/gryderet");
    expect(recipe?.instructions).toEqual(["Snit løgene.", "Lad simre en time."]);
    expect(recipe?.totalTimeMinutes).toBe(75);
    expect(recipe?.prepTimeMinutes).toBe(15);
    expect(recipe?.cookTimeMinutes).toBe(60);
  });

  it("falls back to the DOM when JSON-LD is malformed", () => {
    const html = `
      <html><head>
        <script type="application/ld+json">{ not valid json </script>
      </head><body>
        <h1>Kylling i karry</h1>
        <h2>Ingredienser</h2>
        <ul><li>500 g kyllingebryst</li></ul>
      </body></html>
    `;

    const recipe = parseRecipeDetail(html, "https://x/opskrifter/kylling-i-karry");
    expect(recipe?.title).toBe("Kylling i karry");
    expect(recipe?.ingredients).toEqual(["500 g kyllingebryst"]);
  });

  it("reads microdata itemprop when there is no JSON-LD", () => {
    const html = `
      <html><body itemscope itemtype="https://schema.org/Recipe">
        <h1>Frikadeller</h1>
        <li itemprop="recipeIngredient">500 g hakket svinekød</li>
        <li itemprop="recipeIngredient">1 løg</li>
      </body></html>
    `;

    const recipe = parseRecipeDetail(html, "https://x/opskrifter/frikadeller");
    expect(recipe?.ingredients).toEqual(["500 g hakket svinekød", "1 løg"]);
  });
});

describe("parseRecipeDetail against component-style markup", () => {
  /**
   * The real failure mode in production: the ingredient list is wrapped in a
   * container rather than being a direct sibling of its heading, which the
   * original sibling-only walk could never find.
   */
  it("finds a list nested under a wrapper after the heading", () => {
    const html = `
      <html><body>
        <h1>Frikadeller</h1>
        <section>
          <div class="sc-a1b2c3"><h2>Ingredienser</h2></div>
          <div class="sc-d4e5f6">
            <div><ul>
              <li>500 g hakket svinekød</li>
              <li>1 løg</li>
              <li>1 æg</li>
            </ul></div>
          </div>
        </section>
      </body></html>
    `;

    expect(parseRecipeDetail(html, "https://x/opskrifter/frikadeller")?.ingredients).toEqual([
      "500 g hakket svinekød",
      "1 løg",
      "1 æg",
    ]);
  });

  it("does not borrow a later section's list when a heading has none", () => {
    const html = `
      <html><body>
        <h1>Ret</h1>
        <h2>Ingredienser</h2>
        <p>Se listen hos REMA.</p>
        <h2>Tilbehør</h2>
        <ul><li>Brød</li><li>Smør</li><li>Salat</li></ul>
      </body></html>
    `;

    expect(parseRecipeDetail(html, "https://x/opskrifter/ret")?.ingredients).toEqual([]);
  });

  it("reads ingredients from a Next.js __NEXT_DATA__ blob", () => {
    const html = `
      <html><body>
        <h1>Kylling i karry</h1>
        <script id="__NEXT_DATA__" type="application/json">${JSON.stringify({
          props: {
            pageProps: {
              recipe: {
                title: "Kylling i karry",
                beskrivelse: "En hurtig karryret.",
                portioner: "4 personer",
                ingredienser: [
                  { amount: "500", unit: "g", name: "kyllingebryst" },
                  { amount: "1", unit: "dåse", name: "kokosmælk" },
                ],
                fremgangsmaade: ["Skær kyllingen i tern.", "Steg den gylden."],
              },
            },
          },
        })}</script>
      </body></html>
    `;

    const recipe = parseRecipeDetail(html, "https://x/opskrifter/kylling-i-karry");
    expect(recipe?.ingredients).toEqual(["500 g kyllingebryst", "1 dåse kokosmælk"]);
    expect(recipe?.instructions).toEqual(["Skær kyllingen i tern.", "Steg den gylden."]);
    expect(recipe?.description).toBe("En hurtig karryret.");
    expect(recipe?.servings).toBe(4);
  });

  it("prefers the richest recipe record when the blob holds several", () => {
    const html = `
      <html><body>
        <h1>Ret</h1>
        <script type="application/json">${JSON.stringify({
          related: [{ ingredients: ["1 ting"] }],
          main: { ingredients: ["500 g oksekød", "1 løg", "2 gulerødder"] },
        })}</script>
      </body></html>
    `;

    expect(parseRecipeDetail(html, "https://x/opskrifter/ret")?.ingredients).toEqual([
      "500 g oksekød",
      "1 løg",
      "2 gulerødder",
    ]);
  });

  it("falls back to the longest quantity-led list when nothing is labelled", () => {
    const html = `
      <html><body>
        <h1>Ret</h1>
        <ul><li>Forside</li><li>Opskrifter</li><li>Kontakt</li></ul>
        <ul>
          <li>500 g hakket oksekød</li>
          <li>2 spsk olivenolie</li>
          <li>1 dåse flåede tomater</li>
          <li>400 g pasta</li>
        </ul>
      </body></html>
    `;

    expect(parseRecipeDetail(html, "https://x/opskrifter/ret")?.ingredients).toEqual([
      "500 g hakket oksekød",
      "2 spsk olivenolie",
      "1 dåse flåede tomater",
      "400 g pasta",
    ]);
  });
});

describe("summarizeExtraction", () => {
  it("counts how many recipes actually yielded ingredients and instructions", () => {
    const base = { url: "https://x", title: "t", source: "rema1000" };
    const summary = summarizeExtraction([
      { ...base, id: "a", ingredients: ["x"], instructions: ["y"] },
      { ...base, id: "b", ingredients: ["x"], instructions: [] },
      { ...base, id: "c", ingredients: [], instructions: [] },
    ]);

    expect(summary).toEqual({ total: 3, withIngredients: 2, withInstructions: 1 });
  });
});

/**
 * The crawl the cache actually depends on. The previous version read the
 * `/opskrifter` landing page and stopped at 40 links, so the cache held a
 * curated selection plus three collection pages — while `/opskrifter/aftensmad`
 * states 350 recipes across its numbered pages.
 */
describe("RemaRecipeSource.crawl", () => {
  const THEME_URL = "https://madogdrikke.rema1000.dk/opskrifter/aftensmad";
  const PER_PAGE = 20;

  /** A stand-in site: 350 dinner recipes over 18 numbered listing pages. */
  function fakeSite(totalItems: number, overrides: Record<string, string> = {}) {
    const requested: string[] = [];

    const page = (n: number): FixtureRecipe[] =>
      Array.from({ length: Math.min(PER_PAGE, totalItems - (n - 1) * PER_PAGE) }, (_, i) => ({
        title: `Ret ${(n - 1) * PER_PAGE + i + 1}`,
        slug: `ret-${(n - 1) * PER_PAGE + i + 1}`,
        ingredients: [[400, "g", "hakket oksekød"]] as [number, string, string][],
        steps: ["Steg kødet."],
      }));

    const fetchImpl = (async (input: string | URL) => {
      const url = String(input);
      requested.push(url);
      if (url in overrides) {
        return new Response(overrides[url], { status: 200 });
      }
      const match = url.match(/\/opskrifter\/aftensmad(?:\/(\d+))?$/);
      if (!match) return new Response("not found", { status: 404 });
      const requestedPage = match[1] ? Number(match[1]) : 1;
      const lastPage = Math.ceil(totalItems / PER_PAGE);
      // Out-of-range page numbers clamp back to page 1, as the live site does.
      const served = requestedPage > lastPage ? 1 : requestedPage;
      return new Response(
        buildListingHtml({ recipes: page(served), currentPage: served, totalItems }),
        { status: 200 },
      );
    }) as unknown as typeof fetch;

    return { fetchImpl, requested };
  }

  it("walks every numbered page of the theme", async () => {
    const { fetchImpl, requested } = fakeSite(350);
    const { recipes, stats } = await new RemaRecipeSource(fetchImpl).crawl();

    expect(recipes).toHaveLength(350);
    expect(stats[0]).toMatchObject({
      theme: "aftensmad",
      strategy: "listing-payload",
      reportedTotal: 350,
      pagesFetched: 18,
      recipes: 350,
    });
    expect(requested).toContain(`${THEME_URL}/18`);
    expect(requested).not.toContain(`${THEME_URL}/19`);
  });

  it("keeps the site's own ordering regardless of which fetch finishes first", async () => {
    const { fetchImpl } = fakeSite(60);
    const { recipes } = await new RemaRecipeSource(fetchImpl).crawl();
    expect(recipes.map((r) => r.id).slice(0, 3)).toEqual(["ret-1", "ret-2", "ret-3"]);
    expect(recipes.at(-1)!.id).toBe("ret-60");
  });

  it("carries the theme tags through, so dinner recipes stay identifiable", async () => {
    const { fetchImpl } = fakeSite(20);
    const { recipes } = await new RemaRecipeSource(fetchImpl).crawl();
    expect(recipes[0]!.tags).toEqual(["aftensmad"]);
  });

  /**
   * A page the site clamps renders page 1 again. Accepting it would pad the
   * crawl with duplicates and make a missing page look like a short theme.
   */
  it("rejects a page that comes back as a different page", async () => {
    const { fetchImpl } = fakeSite(60, {
      "https://madogdrikke.rema1000.dk/opskrifter/aftensmad/2": buildListingHtml({
        recipes: [{ title: "Ret 1", slug: "ret-1" }],
        currentPage: 1,
        totalItems: 60,
      }),
    });

    const { recipes, stats } = await new RemaRecipeSource(fetchImpl).crawl();

    expect(stats[0]!.unexpectedPages).toEqual([2]);
    expect(recipes.map((r) => r.id)).not.toContain("ret-21");
    expect(new Set(recipes.map((r) => r.id)).size).toBe(recipes.length);
  });

  it("records pages that failed to fetch instead of reporting a clean run", async () => {
    const failing = (async (input: string | URL) => {
      const url = String(input);
      if (url.endsWith("/aftensmad/2")) return new Response("boom", { status: 500 });
      return fakeSite(60).fetchImpl(url);
    }) as unknown as typeof fetch;

    const { stats } = await new RemaRecipeSource(failing).crawl();
    expect(stats[0]!.failedPages).toEqual([2]);
    expect(stats[0]!.recipes).toBe(40);
  });

  it("crawls several themes and de-duplicates recipes that appear in both", async () => {
    const fetchImpl = (async (input: string | URL) => {
      const url = String(input);
      if (url.endsWith("/aftensmad")) {
        return new Response(
          buildListingHtml({ recipes: [{ title: "Delt ret", slug: "delt-ret" }], totalItems: 1 }),
          { status: 200 },
        );
      }
      if (url.endsWith("/frokost")) {
        return new Response(
          buildListingHtml({
            recipes: [
              { title: "Delt ret", slug: "delt-ret" },
              { title: "Frokostret", slug: "frokostret" },
            ],
            totalItems: 2,
          }),
          { status: 200 },
        );
      }
      return new Response("not found", { status: 404 });
    }) as unknown as typeof fetch;

    const { recipes, stats } = await new RemaRecipeSource(fetchImpl, {
      themes: ["aftensmad", "frokost"],
    }).crawl();

    expect(recipes.map((r) => r.id)).toEqual(["delt-ret", "frokostret"]);
    expect(stats.map((s) => s.theme)).toEqual(["aftensmad", "frokost"]);
  });

  /**
   * If the payload ever stops being readable, falling back to detail pages
   * keeps the cache alive — but it fetches one page per recipe, so it says so
   * through `strategy` rather than looking like a healthy short crawl.
   */
  it("falls back to detail pages when the listing exposes no payload", async () => {
    const listing = `
      <html><body>
        <a href="/opskrifter/alle">Alle opskrifter</a>
        <a href="/opskrifter/aftensmad/2">Side 2</a>
        <a href="/opskrifter/frikadeller">Frikadeller</a>
      </body></html>
    `;
    const detail = `
      <html><body>
        <h1>Frikadeller</h1>
        <h2>Ingredienser</h2>
        <ul><li>500 g hakket svinekød</li></ul>
      </body></html>
    `;

    const fetchImpl = (async (input: string | URL) => {
      const url = String(input);
      if (url.endsWith("/opskrifter/aftensmad")) return new Response(listing, { status: 200 });
      if (url.endsWith("/opskrifter/frikadeller")) return new Response(detail, { status: 200 });
      return new Response("not found", { status: 404 });
    }) as unknown as typeof fetch;

    const { recipes, stats } = await new RemaRecipeSource(fetchImpl).crawl();

    expect(stats[0]!.strategy).toBe("detail-pages");
    expect(recipes).toEqual([
      expect.objectContaining({ id: "frikadeller", ingredients: ["500 g hakket svinekød"], tags: ["aftensmad"] }),
    ]);
  });
});
