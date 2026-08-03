ALTER TABLE "day_plans" ADD COLUMN "recipe_snapshot" jsonb;--> statement-breakpoint
-- Backfill: existing day plans predate recipe_snapshot and referenced the old
-- hand-authored catalog by id; the catalog title isn't recoverable from SQL
-- alone, so backfill a placeholder snapshot using the stored recipe id. These
-- rows are already stale post-migration (base_recipe_id no longer resolves
-- against the new REMA-1000-recipe-backed generator) and are expected to be
-- replaced by regenerating/swapping the affected days.
UPDATE "day_plans"
SET "recipe_snapshot" = jsonb_build_object(
	'title', "base_recipe_id",
	'source', 'catalog',
	'tags', '[]'::jsonb,
	'ingredientLines', '[]'::jsonb
)
WHERE "recipe_snapshot" IS NULL;--> statement-breakpoint
ALTER TABLE "day_plans" ALTER COLUMN "recipe_snapshot" SET NOT NULL;
