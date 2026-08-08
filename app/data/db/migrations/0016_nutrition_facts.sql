CREATE TYPE "public"."nutrition_fact_source" AS ENUM('fatsecret', 'unmatched');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "nutrition_facts" (
	"term" text PRIMARY KEY NOT NULL,
	"source" "nutrition_fact_source" NOT NULL,
	"query" text NOT NULL,
	"food_id" text,
	"food_name" text,
	"kcal" double precision,
	"protein_g" double precision,
	"fat_g" double precision,
	"carbs_g" double precision,
	"saturated_fat_g" double precision,
	"fiber_g" double precision,
	"sugar_g" double precision,
	"sodium_mg" double precision,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
