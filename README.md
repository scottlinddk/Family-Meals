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

## Recipe suggestions from REMA 1000's own recipes

`RemaRecipeSource` (`app/adapters/recipeSource/RemaRecipeSource.ts`) fetches
and parses REMA 1000's public recipe site
(madogdrikke.rema1000.dk/opskrifter), separate from the hand-authored
`RECIPE_CATALOG` used for the adult/child variant pipeline. Click "Refresh
recipes" on `/offers` (`POST /api/recipes/refresh`) to re-scrape, and the
"Best meals from this week's offers" panel
(`GET /api/recipes/suggestions`, `app/domain/recipes/externalRecipeMatch.ts`)
ranks the cached recipes by how many ingredients are on offer this week.
Like the offer source above, madogdrikke.rema1000.dk returned 403 from this
sandbox, so the HTML selectors are written defensively against common
markup patterns and covered by fixture-based tests
(`RemaRecipeSource.test.ts`) rather than live traffic — verify selectors
against the real page in an environment with normal network access.

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
- `npm run db:generate` / `npm run db:migrate` — Drizzle schema migrations
