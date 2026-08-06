CREATE TYPE "public"."plan_share_kind" AS ENUM('week', 'day', 'recipe');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "plan_shares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"kind" "plan_share_kind" NOT NULL,
	"week_start_date" date,
	"day_date" date,
	"recipe_id" text,
	"token" text NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "plan_shares_token_unique" UNIQUE("token")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "plan_shares" ADD CONSTRAINT "plan_shares_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "plan_shares_family_id_kind_idx" ON "plan_shares" USING btree ("family_id","kind");