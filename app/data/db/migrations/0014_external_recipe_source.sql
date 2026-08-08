-- Nullable first so this is safe against a database that already has rows
-- (all of which are REMA's own scraped recipes so far): add the column,
-- backfill it, then tighten to NOT NULL. `IF NOT EXISTS` follows the same
-- reasoning as 0006_external_recipe_tags.sql — safe to re-run if this ever
-- gets applied ahead of a deploy by hand.
ALTER TABLE "external_recipes" ADD COLUMN IF NOT EXISTS "source" text;
UPDATE "external_recipes" SET "source" = 'rema1000' WHERE "source" IS NULL;
ALTER TABLE "external_recipes" ALTER COLUMN "source" SET NOT NULL;
