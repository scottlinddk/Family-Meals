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

There's no confirmed ToS-compliant ongoing API for REMA 1000's offers, so the
only wired-in `OfferSource` (see `app/adapters/offerSource/`) is manual
entry/JSON-paste through the `/offers` page, validated against the reference
schema in `offerSchema.ts`. A future scraper-based or official-API source can
implement the same `OfferSource` interface without touching any meal-planning
logic.

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
