CREATE TABLE IF NOT EXISTS "ingredient_offer_overrides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"ingredient_label" text NOT NULL,
	"offer_name" text NOT NULL,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ingredient_offer_overrides_family_ingredient_offer_unique" UNIQUE("family_id","ingredient_label","offer_name")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ingredient_offer_overrides" ADD CONSTRAINT "ingredient_offer_overrides_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ingredient_offer_overrides_family_id_idx" ON "ingredient_offer_overrides" USING btree ("family_id");