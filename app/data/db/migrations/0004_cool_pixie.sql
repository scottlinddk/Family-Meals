ALTER TABLE "external_recipes" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "external_recipes" ADD COLUMN "instructions" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "external_recipes" ADD COLUMN "servings" integer;--> statement-breakpoint
ALTER TABLE "external_recipes" ADD COLUMN "total_time_minutes" integer;