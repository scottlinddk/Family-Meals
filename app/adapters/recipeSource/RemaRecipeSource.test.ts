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
      ingredients: ["500 g kyllingebryst", "1 dåse kokosmælk", "2 spsk karry"],
    });
  });

  it("returns null when the page has no <h1>", () => {
    expect(parseRecipeDetail("<html><body>no title</body></html>", "https://x/opskrifter/y")).toBeNull();
  });
});
