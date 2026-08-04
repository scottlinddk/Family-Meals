/**
 * Runs the real `RemaRecipeSource` crawl and writes the result to JSON.
 *
 * Why this exists: madogdrikke.rema1000.dk answers
 * `403 This site is not available in your region` to this project's dev
 * sandbox (and to both Supabase regions), so the crawler cannot be exercised
 * against the live site from a normal working environment. Run from somewhere
 * the site answers — the `Scrape REMA recipes` GitHub workflow does exactly
 * that — it reports real coverage: recipes found against the total the theme
 * listing claims, pages walked, and how many recipes came back with
 * ingredients and a method.
 *
 *   npx vite-node --config vitest.config.ts scripts/scrapeRemaRecipes.ts -- [outfile] [theme…]
 *
 * Exits non-zero when the crawl is short of the theme's own stated total, so a
 * partial scrape fails loudly instead of looking like a fresh full cache.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { DINNER_THEME, RemaRecipeSource, summarizeExtraction } from "~/adapters/recipeSource/RemaRecipeSource";

const args = process.argv.slice(2).filter((arg) => arg !== "--");
const outFile = args[0] ?? "scrape-output/rema-recipes.json";
const themes = args.length > 1 ? args.slice(1) : [DINNER_THEME];

const startedAt = Date.now();
const { recipes, stats } = await new RemaRecipeSource(fetch, { themes }).crawl();
const summary = summarizeExtraction(recipes);

await mkdir(dirname(outFile), { recursive: true });
await writeFile(
  outFile,
  JSON.stringify({ scrapedAt: new Date().toISOString(), themes: stats, summary, recipes }, null, 2),
);

console.log(`Crawled ${themes.join(", ")} in ${((Date.now() - startedAt) / 1000).toFixed(1)}s`);
console.log(JSON.stringify({ summary, themes: stats }, null, 2));
console.log(`Wrote ${recipes.length} recipes to ${outFile}`);

const short = stats.filter((s) => s.reportedTotal !== undefined && s.recipes < s.reportedTotal);
if (short.length > 0) {
  for (const s of short) {
    console.error(`Incomplete: ${s.theme} returned ${s.recipes} of ${s.reportedTotal} recipes`);
  }
  process.exit(1);
}
if (summary.withIngredients < summary.total) {
  console.warn(`${summary.total - summary.withIngredients} recipes came back without ingredients`);
}
