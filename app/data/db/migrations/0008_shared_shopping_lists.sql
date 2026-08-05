CREATE TABLE IF NOT EXISTS "shopping_list_checks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"week_start_date" date NOT NULL,
	"item_label" text NOT NULL,
	"checked_by_user_id" uuid,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shopping_list_checks_family_week_label_unique" UNIQUE("family_id","week_start_date","item_label")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "shopping_list_shares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"week_start_date" date NOT NULL,
	"token" text NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "shopping_list_shares_token_unique" UNIQUE("token")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "shopping_list_checks" ADD CONSTRAINT "shopping_list_checks_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "shopping_list_shares" ADD CONSTRAINT "shopping_list_shares_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "shopping_list_checks_family_id_week_start_date_idx" ON "shopping_list_checks" USING btree ("family_id","week_start_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "shopping_list_shares_family_id_week_start_date_idx" ON "shopping_list_shares" USING btree ("family_id","week_start_date");