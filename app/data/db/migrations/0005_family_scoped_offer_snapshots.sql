-- Family-scoped offer snapshots, plus the constraints and indexes the
-- existing tables were missing.
--
-- Hand-adjusted after generation so it survives a non-empty database:
--   * `offers` gains a NOT NULL `snapshot_id`, which existing rows cannot
--     satisfy — they predate family scoping and belonged to no family in
--     particular, so they're cleared. Offers are weekly, disposable data;
--     re-importing is one click on /offers.
--   * `week_plans.offer_snapshot_id` held an ISO timestamp that referenced
--     nothing, so it can't be cast to a real snapshot id — it's nulled out
--     rather than dropped, leaving those plans honestly marked as "no known
--     offer snapshot".
--   * duplicate `(family_id, week_start_date)` plans are collapsed to the
--     most recently updated one before the unique constraint is added.
--   * `week_plans.family_id` gains ON DELETE CASCADE, matching the other
--     family-owned tables; without it a family row could never be deleted.

CREATE TYPE "public"."offer_snapshot_source" AS ENUM('manual', 'etilbudsavis');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "offer_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"source" "offer_snapshot_source" NOT NULL,
	"offer_count" integer NOT NULL,
	"valid_from" timestamp with time zone,
	"valid_until" timestamp with time zone,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "offer_snapshots" ADD CONSTRAINT "offer_snapshots_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "offer_snapshots_family_id_imported_at_idx" ON "offer_snapshots" USING btree ("family_id","imported_at");--> statement-breakpoint

-- Unowned pre-snapshot offers: cleared so the NOT NULL column can be added.
DELETE FROM "offers";--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "snapshot_id" uuid NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "offers" ADD CONSTRAINT "offers_snapshot_id_offer_snapshots_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "public"."offer_snapshots"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "offers_snapshot_id_idx" ON "offers" USING btree ("snapshot_id");--> statement-breakpoint

-- The old value was a generation timestamp, not a foreign key.
ALTER TABLE "week_plans" ALTER COLUMN "offer_snapshot_id" DROP NOT NULL;--> statement-breakpoint
UPDATE "week_plans" SET "offer_snapshot_id" = NULL;--> statement-breakpoint
ALTER TABLE "week_plans" ALTER COLUMN "offer_snapshot_id" SET DATA TYPE uuid USING NULL::uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "week_plans" ADD CONSTRAINT "week_plans_offer_snapshot_id_offer_snapshots_id_fk" FOREIGN KEY ("offer_snapshot_id") REFERENCES "public"."offer_snapshots"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

ALTER TABLE "week_plans" DROP CONSTRAINT IF EXISTS "week_plans_family_id_families_id_fk";--> statement-breakpoint
ALTER TABLE "week_plans" ADD CONSTRAINT "week_plans_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

-- Collapse any week that was generated twice, keeping the newest.
DELETE FROM "week_plans" older
USING "week_plans" newer
WHERE older."family_id" = newer."family_id"
  AND older."week_start_date" = newer."week_start_date"
  AND (older."updated_at", older."id") < (newer."updated_at", newer."id");--> statement-breakpoint
ALTER TABLE "week_plans" ADD CONSTRAINT "week_plans_family_id_week_start_date_unique" UNIQUE("family_id","week_start_date");--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "day_plans_week_plan_id_idx" ON "day_plans" USING btree ("week_plan_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "family_members_user_id_idx" ON "family_members" USING btree ("user_id");
