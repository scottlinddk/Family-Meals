import { describe, expect, it } from "vitest";
import { extractRecipeLinks, parseRecipeDetail } from "~/adapters/recipeSource/RemaRecipeSource";

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
      url: "https://madogdrikke.rema1000.dk/opskrifter/kylling-i-karry",
      imageUrl: "https://cdn.example/kylling.jpg",
      description: undefined,
      ingredients: ["500 g kyllingebryst", "1 dåse kokosmælk", "2 spsk karry"],
      instructions: [],
      servings: undefined,
      totalTimeMinutes: undefined,
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
