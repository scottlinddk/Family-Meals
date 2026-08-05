# Family Meals

A weekly family dinner planner built around REMA 1000's grocery offers, exposed
as a subscribable calendar feed. Generates a shared base recipe per day with
an adult (calorie-minimized) variant and a child (calorie-dense-addition)
variant, so cutting the adults' calories never touches what the toddler eats.
The 6-month-old is intentionally out of scope — see `app/domain/infant/infantNote.ts`.

See `docs/architecture.md`-equivalent context in the codebase itself: start at
`app/domain/types.ts` for the core shapes, `app/domain/planning/generateWeekPlan.ts`
for the generator, and `app/domain/calendar/icsBuilder.ts` for the ICS feed.

## Stack

- React Router v7 (framework/data mode) + Vite + Tailwind
- Supabase Postgres (via Drizzle ORM) for persistence, Supabase Auth
  (email/password) for the edit UI
- Deploy target: Vercel

## Setup

1. Create a Supabase project, then copy `.env.example` to `.env` and fill in
   `DATABASE_URL` (Project Settings → Database → Connection string → URI),
   `SUPABASE_URL`, and `SUPABASE_ANON_KEY` (Project Settings → API).
2. `npm install`
3. `npm run db:generate && npm run db:migrate` to create the schema (see
   `app/data/db/schema.ts`).
4. `npm run dev`

## Data source for weekly offers

There's no confirmed ToS-compliant ongoing API for REMA 1000's own webshop,
so manual entry/JSON-paste through the `/offers` page (validated against the
reference schema in `offerSchema.ts`) remains the safe default `OfferSource`.

Additionally, `EtilbudsavisOfferSource` (`app/adapters/offerSource/EtilbudsavisOfferSource.ts`)
fetches REMA 1000's offers automatically from etilbudsavis.dk — a
third-party tilbudsavis aggregator built on the Tjek platform that publishes
REMA's weekly offers as structured data (name, price, validity period),
rather than the webshop itself. Trigger it from the "Fetch offers now"
button on `/offers`, which calls `POST /api/offers/refresh`. The Tjek API
isn't formally documented, but the endpoints and field shapes this adapter
uses (`/v2/dealers`, `/v2/catalogs`, `/v2/offers?catalog_ids=...` — note
`/v2/offers/search` requires a non-empty `query` and can't list a whole
dealer's offers) were confirmed against live responses and are covered by
`EtilbudsavisOfferSource.test.ts` with real fixture data. It still couldn't
be exercised end-to-end from this project's dev sandbox (api.etilbudsavis.dk
403s this sandbox's outbound requests specifically — bot protection, not a
ToS/auth issue), so do one live `POST /api/offers/refresh` after deploying
to confirm nothing about the catalog/offer volume surprises the pagination
loop.

Both sources implement the same `OfferSource` interface
(`app/adapters/offerSource/OfferSource.ts`), so meal-planning logic doesn't
care which one populated the current offer set.

## Recipes: REMA 1000's own recipe site

`RemaRecipeSource` (`app/adapters/recipeSource/RemaRecipeSource.ts`) fetches
and parses REMA 1000's public recipe site
(madogdrikke.rema1000.dk/opskrifter) and caches the result in the
`external_recipes` table via `externalRecipeRepository`. Click "Refresh
recipes" on `/offers` (`POST /api/recipes/refresh`) to re-scrape.

It crawls a **meal theme** and its numbered listing pages —
`/opskrifter/aftensmad`, `/opskrifter/aftensmad/2`, … — not the
`/opskrifter` landing page. The landing page links a curated selection plus
a few collection pages, which is why the cache sat at 40 recipes (three of
them collection pages stored as ingredient-less "recipes") while
`/opskrifter/aftensmad` states 350 and `/opskrifter/alle` states 670. The
theme defaults to `aftensmad`; pass others through
`new RemaRecipeSource(fetch, { themes: [...] })`, and `/opskrifter/temaer`
lists what exists.

Each listing page is a Nuxt page whose `__NUXT_DATA__` payload carries the
*whole* recipe behind every card — title, image, servings, ingredient groups
with amounts and units, preparation steps, and theme tags — so a theme costs
one request per 20 recipes and no detail-page fetch at all
(`remaListing.ts`, `nuxtPayload.ts`). Two numbers the page states about
itself, `numberOfItems` and `current-page`, make a complete crawl checkable:
`/api/recipes/refresh` reports recipes-found against the theme's own total,
pages walked, and any page it had to skip, and the "Refresh recipes" button
shows it. If the payload ever stops being readable the crawl falls back to
the old per-recipe detail-page extraction (JSON-LD → embedded state →
microdata → class-name heuristics, merged field-by-field in
`parseRecipeDetail`), capped and flagged as `strategy: "detail-pages"`.

`robots.txt` disallows `/api/*` and `/konto/*`; the numbered listing pages
the crawl uses are ordinary crawlable pages.

This cache is the single source of recipes for the whole app: the `/recipes`
browse page (`GET /api/recipes`), a recipe's detail page (`GET
/api/recipes/:id`), the "Best meals from this week's offers" panel
(`GET /api/recipes/suggestions`, `app/domain/recipes/externalRecipeMatch.ts`),
and the weekly plan generator (`generateWeekPlan.ts`/`regenerateDay.ts`,
ranked by offer overlap the same way). Because REMA's own recipes only
expose a title, ingredient list, and image (no structured quantities or a
protein type), days generated from them get a *generic* adult/child variant
disclaimer (`AdultVariant.curated`/`ChildVariant.curated` = `false`) instead
of the hand-authored substitutions/calorie-dense-addition guarantee — see
`deriveUncuratedAdultVariant`/`deriveUncuratedChildVariant` in
`app/domain/recipes/variantDerivation.ts`. The original hand-authored
`RECIPE_CATALOG` (`app/domain/recipes/recipeCatalog.ts`) and its curated
variant derivation still exist in the codebase but are no longer wired into
any route — they're kept in case curated-content generation comes back.

Like the offer source above, madogdrikke.rema1000.dk 403s this sandbox — the
body says `This site is not available in your region`, and it 403s both
Supabase regions too, so it's geography, not bot protection. The parsers are
therefore developed against captures taken from CI, where the fetch
succeeds: `app/adapters/recipeSource/__fixtures__/aftensmad-listing.html` is
a reduced copy of a real listing response, and the `Scrape REMA recipes`
workflow (`.github/workflows/scrape-rema-recipes.yml`) runs the real crawl
via `scripts/scrapeRemaRecipes.ts`, printing coverage and committing/
uploading the scraped JSON. Run that after changing the crawler — it fails
if a theme comes back short of its own stated total.

### Matching recipes to offers

`ingredientOfferScore.ts` reduces both an ingredient line and an offer name to
product tokens and compares them with Danish compound nouns in mind. Its rules
are now tuned against real data — the 350 scraped dinner recipes against a
week's 91 REMA offers — rather than against invented examples, and
`ingredientOfferScore.test.ts` pins the wrong matches that measurement found:
"hvid-" in a wine offer matching every *hvidløg*, a jar-and-bottle offer
matching every "1 flaske øl", *spidskommen* matching *spidskål*, and raw
ingredients matching processed versions of themselves (butter → *smøreost*,
chicken → *kyllingebouillon*, bacon → *baconpostej*).

It is still text matching, so some imprecision remains in both directions:
*bønnespir* matches an offer for *bønner*, and an offer for "REMA 1000
Frilandsgris" does not reach an ingredient line saying *grisekød*. The durable
fix is already in reach — REMA's listing payload links every recipe ingredient
to a specific product (`digitalProduct`, with `is_campaign`/`is_advertised`
price flags), so ingredient-to-offer could become an exact product-id join
instead of a string comparison. Nothing in the app uses that field yet.

## Cook mode

`/weeks/{weekStart}/day/{day}/cook` and `/recipes/{id}/cook` are the same
recipes with everything else taken away: one step at a time in large type,
ingredients one tap away with tick-off boxes, full-width Previous/Next
targets (arrow keys too), and the screen held awake. They sit under their own
pathless layout, `routes/_cook.tsx`, which keeps `_app`'s auth guard but not
its top nav or article column — cooking is the one time the app's chrome is
purely in the way. `buildCookSteps` (`app/domain/recipes/cookSteps.ts`) turns
a recipe into that sequence: one step per method line (dropping the source's
own "1." numbering), or a single ingredients step when the scrape found no
method at all, closing on a serving step that carries the adult/child
variants — the day-plan version only, since that's where the variants exist
and the plate is when they matter.

Two layouts, switched from the segmented control at the top and remembered
per user: `steps` (above) and `all`, which puts ingredients, every numbered
step and the serving notes on one scrollable page — for reading a recipe
through before starting, or cooking from a glance without touching the phone.

Keeping the screen on is the Screen Wake Lock API
(`app/ui/hooks/useKeepScreenAwake.ts`), enabled on entry — opening cook mode
*is* the request — with a toggle in the bar to take it back. Two facts about
the API shape that hook: the OS drops the lock whenever the page is hidden
and does *not* restore it on return, so the cook's intent is tracked
separately from the lock and re-acquired on every `visibilitychange`; and the
API is absent in some browsers (notably iOS before 16.4) and refusable in
others (battery saver). Both are said out loud in the status line under the
bar rather than swallowed — a screen that will dim anyway shouldn't be
promised otherwise. There's no hidden-looping-video fallback for the browsers
that lack it.

## Shopping list: shared, and shareable

The week's list (`/weeks/{weekStart}/shopping-list`) is still *derived* — it
aggregates the seven days' ingredient lines, merges the ones naming the same
product, and groups them by the REMA department of the offer covering them
(`app/domain/planning/shoppingList.ts`). Nothing about that is stored.

What is stored is which lines have been picked up. `shopping_list_checks` holds
one row per ticked line, keyed by **family and week**, not by user. That's a
deliberate reversal: ticks used to live in `localStorage`, on the argument that
two people shopping different aisles want their own checkboxes. In practice
they want the opposite — one trolley, two people, and the whole question is
whether the milk is already in it. Unticking deletes the row, so "no row" means
unticked and the table only holds what's actually been picked up.

The item's identity is its **label** — the ingredient line as the recipe wrote
it, which is what the list already merges on. There are no stable item ids to
reference, because the list is rebuilt from the plan on every request, so a
regenerated week simply leaves ticks whose label no longer appears; they're
ignored on read rather than cleaned up.

### The `/list/{token}` share link

"Share list" on the shopping list page issues an unguessable
`/list/{token}` URL (`shopping_list_shares`, `app/lib/tokens.ts`) for the
person actually doing the shopping — who often doesn't have an account, which
is why an invite to the family wouldn't do. Same bearer-token model as the ICS
feed: the token is the whole credential, so it decides the family *and* the
week and nothing about which list is served comes from the caller.

Holders can tick items off. That's the point — the ticks are the shared part,
and a list they could only read would leave everyone else's copy wrong — but
it's the *only* thing the link can write, on one week, and `checked_by_user_id`
is left null because there's no account behind it. Clearing the whole list is
deliberately not offered through the link. Scoped to a single week rather than
to the family, so a link sent once doesn't leak next week's plan; pressing
"share" again reuses the live link rather than killing the one already sitting
in someone's messages; and revoking sets `revoked_at` so the token stays
permanently dead rather than becoming re-issuable.

### Ticking on a bad connection

Ticks are polled every 20 seconds while the page is on screen, so two people in
the same shop see each other's. Going through the server would otherwise have
cost the one thing `localStorage` gave for free — working with no signal, in a
supermarket, which is exactly where this is used. So a tick is written to a
small local queue first (`app/ui/hooks/useShoppingChecks.ts`), applied to the
screen immediately, and sent when there's a connection: on the next tick, when
the tab comes back, or when the browser reports it's online. The queue holds
the *intent* per label rather than a history, which is the only sane thing to
replay against a set, and it wins over the server's answer on screen so a poll
landing mid-queue can't make the box someone just tapped flick back.
Undelivered ticks say so under the count; a tick the server *refused* says
something different, because then the screen and the family's list disagree.

## Installable web app

The app declares a web app manifest (`public/manifest.webmanifest`) and a
service worker (`public/sw.js`), so it can be installed to a home screen and
opened without browser chrome — including a shortcut straight to
`/shopping-list`, a fixed URL that bounces to the current week's list the way
`/` bounces to the current week's plan.

The service worker keeps three caches, each with a different bargain: hashed
build assets under `/assets/` are cache-first (the bytes behind a hashed URL
can never change); documents and shopping-list data are network-first, falling
back to the last copy so a page you've opened before — the list, above all —
still renders in an aisle where the request times out; everything else goes to
the network and is allowed to fail there, because a stale week plan claiming to
be current is worse than an honest error. A page never opened before falls back
to `public/offline.html`, which is deliberately standalone (no build assets, no
fonts, no scripts — the situation it renders in is "nothing else could be
fetched"). The two caches holding anything personal are emptied when someone
signs out, so a shared laptop doesn't keep serving one family's plan to the next
person. `VERSION` in `sw.js` is what retires old caches — bump it when the file
changes. Registration is production-only: in dev a worker caching Vite's asset
URLs would serve yesterday's modules over today's edits.

The icons — `favicon.svg`, `favicon.ico`, the 180px apple-touch-icon, and the
192/512px manifest icons including a maskable one — are generated from a single
geometry definition by `scripts/generateIcons.mjs` (`npm run icons:generate`),
which rasterizes and encodes the PNGs itself rather than adding an image
dependency for a few circles and capsules. Edit the geometry there, not the
files; the SVG and the pixels come from the same numbers, so they can't drift.

## View preferences

`user_preferences` (one row per Supabase Auth user id, `app/data/db/schema.ts`)
stores how someone likes the app laid out — currently just `cook_view_mode`.
Keyed by *user*, not family, on purpose: two people cooking the same plan can
want different layouts, and the choice should follow the person to their other
devices. Rows are written by upsert on first change, so "no row" is the normal
state and means the defaults in `app/domain/preferences.ts`.

`GET/PATCH /api/preferences` serves it, and `useUserPreferences` /
`useSetCookViewMode` (`app/ui/hooks/useUserPreferences.ts`) read and write it,
applying the change to the query cache before the request goes out — flipping
a layout is direct manipulation of what's on screen and shouldn't wait on a
round trip. A failed save rolls the cache back and the toggle says the
preference didn't stick.

`GET` answers with the defaults if the database is missing the table (see
`dbErrors.ts` — code deploys ahead of `npm run db:migrate` here), since an
unsaved preference and an unreachable one are the same thing to the page
asking, and cook mode has to open either way. `PATCH` does report it, because
there the difference is the whole point.

## Locale

Danish (`da`) is the app's default and only fully-translated locale — see
`app/i18n/`. `t(key, vars?)` looks up `app/i18n/dictionaries/da.ts` first,
falling back to `en.ts` (kept as a secondary locale) then the raw key.
`<html lang>` is set from `DEFAULT_LOCALE` in `app/root.tsx`.

## Families and invites

A family can have several members sharing the same meal plan (`app/data/db/schema.ts`'s
`family_members` join table). Signing up auto-creates a family with you as its
`owner` (`requireFamilyMembership` in `app/lib/auth.ts`). From `/family` you can
rename the family and invite another person by email — this generates an
unguessable `/invite/{token}` link (`family_invites` table, `app/lib/tokens.ts`)
for you to send them yourself (there's no transactional email sending yet, same
tradeoff as the calendar subscription link). Visiting that link prompts sign-up/
login if needed, preserving the invite via `redirectTo` through
`auth.signup`/`auth.login`/`auth.callback`, then joins the invited user to the
inviting family as a `member` — see `app/routes/invite.$token.tsx` and
`app/routes/api.family.invites.$token.accept.tsx`. Accepting deliberately
bypasses `requireFamily`'s auto-create so an invited user doesn't get
provisioned their own family before they get a chance to join yours.

## Calendar subscription

Each family gets a stable, unguessable `/calendar/{token}.ics` URL (shown via
"Subscribe in your calendar app" on the week view) that Google/Apple/Outlook
can subscribe to. It's computed fresh from the database on every request, so
edits show up the next time the calendar app refreshes — see
`app/routes/calendar.$token[.]ics.tsx` and `app/domain/calendar/uid.ts` for
how event identity stays stable across edits.

## Scripts

- `npm run dev` — start the dev server
- `npm run build` / `npm start` — production build/serve
- `npm run typecheck` — `react-router typegen && tsc --noEmit`
- `npm test` — Vitest unit tests (domain logic only)
- `npm run icons:generate` — redraw the favicon and app icons into `public/`
- `npm run db:generate` / `npm run db:migrate` — Drizzle schema migrations
- `npm run db:deploy-migrate` — runs `db:migrate` during a Vercel *production*
  build (skipped on previews and locally), so a release can't go live against a
  database that hasn't got its schema yet. Needs `DATABASE_URL` exposed to the
  Build step as a direct connection string (port 5432, not the 6543 pooler).
