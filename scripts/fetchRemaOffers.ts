/**
 * Runs `EtilbudsavisOfferSource` and writes REMA 1000's current offers to
 * JSON — the offer-side counterpart of `scrapeRemaRecipes.ts`, and the first
 * end-to-end exercise of that adapter.
 *
 * api.etilbudsavis.dk 403s this project's dev sandbox, so the adapter has only
 * ever been covered by fixture tests. Run from somewhere the API answers (the
 * `Fetch REMA offers` workflow), it reports what came back: how many offers,
 * their validity window, and a sample — so the pagination loop and the field
 * mappings meet real data before the app depends on them.
 *
 *   npx vite-node --config vitest.config.ts scripts/fetchRemaOffers.ts -- [outfile]
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { EtilbudsavisOfferSource } from "~/adapters/offerSource/EtilbudsavisOfferSource";

const args = process.argv.slice(2).filter((arg) => arg !== "--");
const outFile = args[0] ?? "scrape-output/rema-offers.json";

const startedAt = Date.now();
const offers = await new EtilbudsavisOfferSource().fetchCurrentOffers();

await mkdir(dirname(outFile), { recursive: true });
await writeFile(outFile, JSON.stringify({ fetchedAt: new Date().toISOString(), offers }, null, 2));

const validFrom = offers.map((o) => o.validFrom).sort()[0];
const validUntil = offers.map((o) => o.validUntil).sort().at(-1);
console.log(`Fetched ${offers.length} offers in ${((Date.now() - startedAt) / 1000).toFixed(1)}s`);
console.log(`Validity: ${validFrom} → ${validUntil}`);
console.log(`Sample: ${JSON.stringify(offers.slice(0, 5), null, 2)}`);
console.log(`Wrote ${outFile}`);

if (offers.length === 0) {
  console.error("No offers came back — the catalog lookup or the pagination loop found nothing.");
  process.exit(1);
}
