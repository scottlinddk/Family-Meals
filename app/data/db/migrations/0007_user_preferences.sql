CREATE TYPE "public"."cook_view_mode" AS ENUM('steps', 'all');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_preferences" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"cook_view_mode" "cook_view_mode" DEFAULT 'steps' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
