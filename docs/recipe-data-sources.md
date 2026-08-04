# Recipe data sources

A survey of where recipe content could come from, beyond the REMA 1000 offer
data. This is a research note, not a plan of record: **nothing below is
verified as scrapable**, only that a recipe destination appears to exist.
Every site needs its own ToS/robots check before an automated adapter is
built against it.

Verification status of this document: none of the sites or APIs listed could
be fetched from the development sandbox — every host returns 403 to the
sandbox's outbound requests, the same limitation already documented for
`api.etilbudsavis.dk` and `madogdrikke.rema1000.dk` in the README. Existence
claims come from search results and from the community-maintained
[API-Danmark](https://github.com/mauran/API-Danmark) index; claims about page
structure, API payloads, and recipe counts are unverified and marked as such.

## What the codebase already assumes

Three facts from the current code change what is and isn't worth adding.

**1. Recipes do not have to come from the chain whose offers are loaded.**
`rankExternalRecipesByOffers` (`app/domain/recipes/externalRecipeMatch.ts`)
scores a recipe by how many of its *ingredient lines* match this week's
offer names, via the token normalization in `ingredientOfferScore.ts`. It
never looks at which site the recipe came from. A Valdemarsro recipe and a
føtex recipe are ranked against REMA offers by exactly the same rule. So the
chain-by-chain framing below is about *breadth and quality of the recipe
corpus*, not about a technical requirement to match chains.

**2. Adding a site is mostly configuration, not a new adapter.**
`RemaRecipeSource` already extracts in four layers — schema.org/Recipe
JSON-LD (`recipeJsonLd.ts`), the framework's embedded state blob
(`embeddedState.ts`), microdata `itemprop`, then class-name heuristics — and
merges them field by field. Only `BASE_URL`, `LISTING_PATH`, and the
listing-page link discovery are REMA-specific. Any site that emits
schema.org/Recipe (which commercial recipe sites do, because Google's recipe
rich results require it) is reachable through the same pipeline. "One
adapter per site" overstates the cost by a wide margin.

**3. Two real blockers exist before *any* second source.**
- `ExternalRecipe` (`app/domain/types.ts`) has no `source`/chain field, and
  neither does the `external_recipes` table (`app/data/db/schema.ts`).
  There's no way to tell the UI where a recipe came from, or to refresh one
  source without the other.
- `externalRecipeRepository.replaceAll` deletes the entire table before
  inserting. A second source would wipe the first one's recipes on every
  refresh. This needs to become a per-source replace before multi-source is
  possible at all.

## Chains with a recipe destination

### Already implemented
- **REMA 1000** — `madogdrikke.rema1000.dk/opskrifter`, live in
  `RemaRecipeSource`. Note this is a *different* thing from the REMA themed
  magazines on Tjek (below); the survey's original framing conflated them.

### Salling Group (føtex, Bilka, Netto)
- **føtex** — recipes on `foetex.dk`, separate from its Tjek offer
  publication.
- **Netto** — `netto.dk/opskrifter/`. The earlier survey said Netto had no
  recipe source; that appears to be wrong.
- **Bilka** — `bilka.dk/guides/gd/opskrifter/`, and separately
  `bilkatogo.dk/inspiration/opskrifter/`. BilkaToGo is the e-commerce
  storefront, so its recipes are likely to link ingredient lines to actual
  purchasable products. If that holds it is the single most valuable
  structure in this list: it would give quantities and product identity
  instead of free-text ingredient lines, which is exactly what the variant
  pipeline is missing today.

All three are Salling Group, so the recipe backends may be shared. Worth
checking one page from each before assuming three separate integrations —
one config covering three chains is plausible.

### Coop (Kvickly, SuperBrugsen, Coop 365)
Offers are on Tjek; recipes live on a separate Coop-owned domain,
`opskrifter.coop.dk` and/or the "GoCook" recipe engine, not part of the Tjek
publication. Separate site and schema from the offers adapter.

**But scraping Coop may be unnecessary — see the Coop Recipe API below.**

Note: Coop's Tjek business record for Kvickly showed `isEnabled: false` with
an empty publications list at one point — verify Kvickly is still active on
Tjek before relying on it for *offers* either.

### Lidl
`opskrifter.lidl.dk` — a dedicated recipe subdomain, reportedly several
hundred recipes, with category paths like `/aftensmad`. The earlier survey
said Lidl had no recipe source; that also appears to be wrong, and the
dedicated subdomain suggests a purpose-built recipe CMS rather than a few
marketing pages.

### MENY
Two distinct things, previously collapsed into one:
- A web recipe section on `meny.dk` (reported around 1,500–2,000 recipes,
  shared with the MENY app). This is the substantive source and belongs in
  the same tier as Netto/Lidl/føtex.
- "SPISETID magasin", a recurring themed publication on the *same* Tjek
  platform as the offers (see below).

### SPAR
Recipes are referenced as living inside the "SPAR SAMMEN" mobile app. No
public web equivalent confirmed. Needs manual verification before assuming a
web-based source exists at all.

### Themed magazines on Tjek (MENY, REMA 1000)
MENY's "SPISETID magasin" and REMA's "Meget mere sæson" / "Dansk & Lokalt"
are published through the same Tjek platform as the weekly offer avis, in
the same paged/incito format — so the existing offer adapter mechanism could
technically reach them. Unconfirmed whether the pages carry machine-readable
recipe text (ingredients, quantities, steps) or are image/styling only.
Verify by opening a magazine in the MENY or REMA app, or on etilbudsavis.dk
with JavaScript enabled, before building anything. Given REMA's own recipe
site is already wired in and returns clean text, the magazines are low
priority for REMA specifically.

### ALDI — skip
`aldi.dk/opskrifter.html` still surfaces in search results, but ALDI exited
the Danish market in 2023 (REMA 1000 bought 114 of its 188 stores, the rest
closed). There is no ALDI offer set to tie recipes to, and the site is
presumably unmaintained. Not worth an adapter.

## Documented APIs — sanctioned access, not scraping

This tier deserves to be read first, because it is the only part of this
document where access terms are *stated* rather than guessed at. Everything
else here is "probably parseable, permission unknown"; these two publish a
registration path.

- **Coop Recipe API v2** — `developer.cl.coop.dk`, an Azure API Management
  portal fronting `api.cl.coop.dk/recipeapi/v2/`. Advertised as 10,000+
  recipes "for third-party websites and products", authenticated with an
  `Ocp-Apim-Subscription-Key` header issued against a developer profile.
  Visible operations include `Recipes_GetMany` and, notably,
  `Social_SetDinnerPlan` — this looks like the backend behind Coop's own
  meal-planning app, which is close to what this project does. The same
  portal also lists Store, Assortment, and Product APIs, which may be
  independently interesting for product/price data.

  This would supersede any `opskrifter.coop.dk` scraper entirely, and it is
  the only lead here that could plausibly deliver structured quantities
  under stated terms. Unverified: whether registration is still open to the
  public (a `developerdemo.` variant of the portal also exists, which hints
  at legacy/demo tenants), what the licence permits, and what the recipe
  payload actually contains. Worth 20 minutes of someone signing up before
  any scraping work is scheduled.

- **MadOpskrifter.nu API** — `start.madopskrifter.nu/madopskrifternuapi.aspx`,
  a JSON API listed as *public* in the community-maintained
  [API-Danmark](https://github.com/mauran/API-Danmark) index, which describes
  it as the only Danish recipe site offering a developer API. Older stack
  (WCF, URL-invoked methods) and unknown corpus size/quality. Cheap to
  evaluate.

For reference, that same index lists Tjek/eTilbudsavis as *private* — which
matches what the offers adapter already had to work out empirically.

## Sources not tied to a chain

Because matching is ingredient-based (point 1 above), these are viable and
in several cases better-suited to a *family dinner* planner than chain
marketing content. Chain recipe sites push what the chain is promoting,
which correlates only weakly with what's actually discounted; a large
general corpus gives the ranker more candidates to find genuinely
high-coverage matches among.

Ordered by fit with this app — family dinners, ordinary supermarket
ingredients, child-friendly:

- **mummum.dk** — explicitly child-friendly family cooking built on simple
  supermarket ingredients. That is almost exactly this app's brief (shared
  base recipe, toddler-safe child variant), so it's the strongest editorial
  fit in the list despite not being the largest.
- **madensverden.dk** — running since 2012, reportedly 8,000+ tested
  recipes, step-by-step, explicitly written around ingredients available in
  ordinary supermarkets. Has an `/opskriftsindeks/` index page, which is
  exactly the shape the listing-link discovery step wants. Best
  size-times-fit trade in the list.
- **valdemarsro.dk** — Danish everyday/family cooking with a dedicated
  `/aftensmad/` section and child-friendly categories. Independently run, so
  permission matters more here than with a corporate site.
- **nemlig.com** — online-only supermarket with a recipe section
  (`/opskrifter/mest-populaere` and similar) tied to purchasable products.
  Same potential upside as BilkaToGo: ingredient lines that may carry
  quantities and product links. No weekly avis, so it contributes recipes
  only.
- **arla.dk/opskrifter** — large, professionally maintained, structured,
  with an `/inspiration/aftensmad/` family-dinner section; very likely to
  carry schema.org/Recipe for rich results. Corporate site, so the
  permission question is at least addressable to someone.
- **samvirke.dk** — Coop's member magazine. Editorially independent-feeling
  but Coop-owned, so it sits between this section and the Coop entry above;
  if the Coop API covers it, prefer that.
- **spisbedre.dk** — monthly food magazine with a recipe archive. Magazine
  publishers tend to be stricter about reuse than either supermarkets or
  blogs; treat permission as unlikely without asking.
- **dk-kogebogen.dk** ("Alletiders Kogebog") — the breadth option:
  user-submitted, reportedly tens of thousands of recipes, of which a
  minority are illustrated. Quality and formatting are inconsistent, and
  because the content is user-contributed the site may not hold the rights
  to license it onward — a distinct permission problem from the others.
- **gastromand.dk** — weaker fit (weekend/hobby cooking skew rather than
  weeknight family dinners), listed for completeness.

For all of these, "sensible to add" is conditional on permission. A personal
blog is a different ethical situation from a supermarket's marketing site,
even when the markup is equally easy to parse — and a user-contributed
archive is a third situation again. The URL-paste import in step 1 of the
recommended order sidesteps most of this, since it fetches one page the user
chose rather than crawling a catalog.

## Non-recipe data worth more than another recipe site

The app's known quality gap isn't recipe *volume* — it's that scraped
recipes expose a title, an ingredient list, and an image, with no quantities
and no protein type, so every generated day falls back to the generic
uncurated adult/child variant disclaimer
(`deriveUncuratedAdultVariant`/`deriveUncuratedChildVariant`). A fifth
recipe site does not fix that. These do:

- **Frida — DTU Fødevaredata** (`frida.fooddata.dk`). Denmark's official
  food composition database from DTU Fødevareinstituttet: energy and
  nutrients for 1,000+ foods, downloadable as a spreadsheet (behind a
  name/email form; confirm the attribution/licence terms before
  redistributing). This is the missing half of the calorie-minimized adult
  variant — with it, a parsed quantity plus an ingredient match yields a
  real kcal figure instead of a disclaimer. It's a static dataset, so it
  ships as a bundled table, not a scraper: no ToS-per-request problem, no
  live fetching, no bot protection.
- **Open Food Facts** — barcode-level nutrition for branded products under
  an open licence (ODbL). Complements Frida, which covers generic foods
  better than packaged ones.

Both require ingredient-name → food-item matching, which is the same problem
`ingredientOfferScore.ts` already solves for offer names. The token
normalization there is directly reusable.

## Recommended order

0. **Sign up for the Coop and MadOpskrifter APIs and read what they
   actually return.** Cheapest possible step, and it can invalidate a lot of
   the work below: a sanctioned API with 10,000+ recipes and stated terms
   beats every scraper in this document, and if its payload carries
   structured quantities it also partly overlaps with what Frida is needed
   for. Do this before scheduling anything else.
1. **URL-paste import.** Extend the manual-entry path so a pasted *URL* is
   fetched once and run through the existing `recipeJsonLd` extractor. One
   implementation covers every site in this document that emits
   schema.org/Recipe, and a single user-initiated fetch is a far lighter
   ToS posture than crawling a catalog. Highest value per unit of work by a
   large margin.
2. **Unblock multi-source.** Add `source` to `ExternalRecipe`, the
   `external_recipes` table, and make `replaceAll` per-source. Nothing else
   here is possible until this lands.
3. **Generalize `RemaRecipeSource`** into a config-driven HTML recipe source
   (base URL + listing path + link pattern), keeping the four-layer
   extraction as-is. After this, adding a site is a config entry.
4. **Frida** for nutrition, which upgrades every recipe already in the cache
   rather than adding more of them.
5. **The best-fit non-chain sites** (mummum.dk, madensverden.dk,
   valdemarsro.dk), each gated on its own permission check. These come
   before the chain crawlers because the editorial fit is better and the
   corpora are larger, and because matching never cared about provenance.
6. **Per-chain crawlers** (Netto, Lidl, føtex/Bilka, MENY), one at a time,
   each gated on its own ToS/robots check and a live structure check from an
   environment with normal network access.
7. **Tjek magazines**, only if step 6 leaves a chain whose recipes are
   otherwise unreachable.
