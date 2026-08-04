import { describe, expect, it } from "vitest";
import { diagnoseRecipeHtml } from "~/adapters/recipeSource/scrapeDiagnostics";

describe("diagnoseRecipeHtml", () => {
  it("reports the structure needed to target selectors", () => {
    const html = `
      <html><head><title>Kylling</title></head><body>
        <h1>Kylling i karry</h1>
        <h2>Ingredienser</h2>
        <div class="recipe-ingrediens-list"><ul><li>500 g kyllingebryst</li></ul></div>
        <h2>Fremgangsmåde</h2>
      </body></html>
    `;

    const report = diagnoseRecipeHtml(html, "https://madogdrikke.rema1000.dk/opskrifter/x", 200);

    expect(report.status).toBe(200);
    expect(report.looksBlocked).toBe(false);
    expect(report.title).toBe("Kylling i karry");
    expect(report.headings).toEqual(["Kylling i karry", "Ingredienser", "Fremgangsmåde"]);
    expect(report.ingredientAttributes).toContain('class="recipe-ingrediens-list"');
    expect(report.ingredientExcerpt).toContain("Ingredienser");
    expect(report.extracted.ingredients).toBe(1);
    expect(report.extracted.sample).toEqual(["500 g kyllingebryst"]);
  });

  it("flags a bot-protection interstitial rather than reporting an empty page", () => {
    const report = diagnoseRecipeHtml(
      "<html><body><h1>Just a moment...</h1><p>Checking your browser</p></body></html>",
      "https://madogdrikke.rema1000.dk/opskrifter/x",
      403,
    );

    expect(report.looksBlocked).toBe(true);
    expect(report.extracted.ingredients).toBe(0);
  });

  it("detects a schema.org Recipe and an embedded ingredient key", () => {
    const html = `
      <html><body><h1>Ret</h1>
        <script type="application/ld+json">${JSON.stringify({
          "@type": "Recipe",
          name: "Ret",
          recipeIngredient: ["1 løg"],
        })}</script>
        <script type="application/json">{"ingredienser":["1 løg"]}</script>
      </body></html>
    `;

    const report = diagnoseRecipeHtml(html, "https://madogdrikke.rema1000.dk/opskrifter/x", 200);

    expect(report.jsonLd.hasRecipe).toBe(true);
    expect(report.jsonLd.types).toContain("Recipe");
    expect(report.embeddedState.foundIngredientKey).toBe(true);
  });
});
