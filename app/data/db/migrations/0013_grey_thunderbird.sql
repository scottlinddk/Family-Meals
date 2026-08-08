CREATE TABLE IF NOT EXISTS "shopping_list_extra_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"week_start_date" date NOT NULL,
	"item_label" text NOT NULL,
	"added_by_user_id" uuid,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shopping_list_extra_items_family_week_label_unique" UNIQUE("family_id","week_start_date","item_label")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "shopping_list_extra_items" ADD CONSTRAINT "shopping_list_extra_items_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "shopping_list_extra_items_family_id_week_start_date_idx" ON "shopping_list_extra_items" USING btree ("family_id","week_start_date");