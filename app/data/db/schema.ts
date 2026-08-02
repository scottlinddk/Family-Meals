import {
  boolean,
  date,
  doublePrecision,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * One row per family. `calendarToken` is the unguessable bearer credential
 * embedded in the ICS subscription URL (webcal://.../calendar/{token}.ics)
 * — separate and weaker than the Supabase Auth session used for editing, so
 * a leaked calendar link only exposes read-only meal names.
 */
export const families = pgTable("families", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** Supabase Auth user id that owns/edits this family's plan. */
  ownerUserId: uuid("owner_user_id").notNull(),
  calendarToken: text("calendar_token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Manually entered/imported weekly offers (the "safe default" OfferSource). */
export const offers = pgTable("offers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  unitSizeFrom: doublePrecision("unit_size_from").notNull(),
  unitSizeTo: doublePrecision("unit_size_to").notNull(),
  unitSymbol: text("unit_symbol").notNull(),
  price: doublePrecision("price").notNull(),
  currencyCode: text("currency_code").notNull(),
  unitPrice: doublePrecision("unit_price").notNull(),
  baseUnit: text("base_unit").notNull(),
  departmentSlug: text("department_slug").notNull(),
  validFrom: timestamp("valid_from", { withTimezone: true }).notNull(),
  validUntil: timestamp("valid_until", { withTimezone: true }).notNull(),
  importedAt: timestamp("imported_at", { withTimezone: true }).notNull().defaultNow(),
});

export const weekPlans = pgTable("week_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  familyId: uuid("family_id")
    .notNull()
    .references(() => families.id),
  weekStartDate: date("week_start_date").notNull(),
  offerSnapshotId: text("offer_snapshot_id").notNull(),
  generatorVersion: text("generator_version").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * One row per planned dinner. `adultVariant`/`childVariant` are stored as
 * jsonb snapshots (matching the AdultVariant/ChildVariant domain shape) so
 * edits are self-contained per day and don't depend on the recipe catalog
 * having stayed unchanged since generation.
 */
export const dayPlans = pgTable("day_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  weekPlanId: uuid("week_plan_id")
    .notNull()
    .references(() => weekPlans.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  mealSlot: text("meal_slot").notNull().default("dinner"),
  baseRecipeId: text("base_recipe_id").notNull(),
  adultVariant: jsonb("adult_variant").notNull(),
  childVariant: jsonb("child_variant").notNull(),
  isManualOverride: boolean("is_manual_override").notNull().default(false),
  editedAt: timestamp("edited_at", { withTimezone: true }).notNull().defaultNow(),
  /** Bumped on every write; drives ICS SEQUENCE for this day's VEVENT. */
  sequence: integer("sequence").notNull().default(0),
});
