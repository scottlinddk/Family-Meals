-- Adds "we already have this at home" alongside "it's in the trolley", which
-- turns the table's single meaning into one of two states — hence the rename
-- of the table and its `checked_*` columns.
--
-- Hand-written as renames rather than the drop-and-recreate drizzle-kit
-- generates for a renamed table: the existing rows are a family's marks on
-- the week they're shopping right now, and dropping the table would clear
-- them mid-shop. The accompanying snapshot is drizzle's own, so the next
-- `db:generate` still diffs against the right state.
CREATE TYPE "public"."shopping_list_item_status" AS ENUM('checked', 'at_home');--> statement-breakpoint
ALTER TABLE "shopping_list_checks" RENAME TO "shopping_list_marks";--> statement-breakpoint
ALTER TABLE "shopping_list_marks" RENAME COLUMN "checked_by_user_id" TO "marked_by_user_id";--> statement-breakpoint
ALTER TABLE "shopping_list_marks" RENAME COLUMN "checked_at" TO "marked_at";--> statement-breakpoint
ALTER TABLE "shopping_list_marks" RENAME CONSTRAINT "shopping_list_checks_family_week_label_unique" TO "shopping_list_marks_family_week_label_unique";--> statement-breakpoint
ALTER TABLE "shopping_list_marks" RENAME CONSTRAINT "shopping_list_checks_family_id_families_id_fk" TO "shopping_list_marks_family_id_families_id_fk";--> statement-breakpoint
ALTER INDEX "shopping_list_checks_family_id_week_start_date_idx" RENAME TO "shopping_list_marks_family_id_week_start_date_idx";--> statement-breakpoint
ALTER TABLE "shopping_list_marks" RENAME CONSTRAINT "shopping_list_checks_pkey" TO "shopping_list_marks_pkey";--> statement-breakpoint
-- Every row that existed before this migration was a tick, so `checked` is
-- both the right backfill for them and the right default for the upsert that
-- writes new ones.
ALTER TABLE "shopping_list_marks" ADD COLUMN "status" "shopping_list_item_status" DEFAULT 'checked' NOT NULL;
