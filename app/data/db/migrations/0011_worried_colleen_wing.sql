CREATE TABLE IF NOT EXISTS "family_store_settings" (
	"family_id" uuid PRIMARY KEY NOT NULL,
	"selected_stores" jsonb DEFAULT '["rema1000","netto","foetex","meny"]'::jsonb NOT NULL,
	"member_stores" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "offer_snapshots" ADD COLUMN "store_id" text DEFAULT 'rema1000' NOT NULL;--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "store_id" text DEFAULT 'rema1000' NOT NULL;--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "member_only" boolean DEFAULT false NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "family_store_settings" ADD CONSTRAINT "family_store_settings_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "offer_snapshots_family_id_store_id_imported_at_idx" ON "offer_snapshots" USING btree ("family_id","store_id","imported_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "offers_snapshot_id_store_id_idx" ON "offers" USING btree ("snapshot_id","store_id");