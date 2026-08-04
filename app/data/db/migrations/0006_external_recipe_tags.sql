-- `IF NOT EXISTS` (drizzle-kit generates a bare ADD COLUMN) because this
-- column was applied to the live database ahead of the deploy, to load the
-- full dinner-theme scrape into it. Without it, the next production build's
-- `db:deploy-migrate` would re-run this statement, fail on 42701, and — by
-- design since f077c13 — fail the release.
ALTER TABLE "external_recipes" ADD COLUMN IF NOT EXISTS "tags" jsonb DEFAULT '[]'::jsonb NOT NULL;