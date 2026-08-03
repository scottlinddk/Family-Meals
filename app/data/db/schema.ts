import {
  boolean,
  date,
  doublePrecision,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
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
  name: text("name"),
  calendarToken: text("calendar_token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const familyMemberRole = pgEnum("family_member_role", ["owner", "member"]);

/**
 * Membership join table: which Supabase Auth users can see/edit a family's
 * plan. `families.ownerUserId` stays as a historical "who created this"
 * pointer, but access control is driven entirely by this table so a family
 * can have more than one member.
 */
export const familyMembers = pgTable(
  "family_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    familyId: uuid("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull(),
    role: familyMemberRole("role").notNull().default("member"),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("family_members_family_id_user_id_unique").on(table.familyId, table.userId)],
);

export const familyInviteStatus = pgEnum("family_invite_status", ["pending", "accepted", "revoked"]);

/**
 * A pending (or resolved) invitation to join a family, identified by an
 * unguessable `token` embedded in the `/invite/{token}` link the inviter
 * shares out-of-band (no transactional email sending in this app yet).
 */
export const familyInvites = pgTable("family_invites", {
  id: uuid("id").primaryKey().defaultRandom(),
  familyId: uuid("family_id")
    .notNull()
    .references(() => families.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  token: text("token").notNull().unique(),
  invitedByUserId: uuid("invited_by_user_id").notNull(),
  status: familyInviteStatus("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
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

/**
 * REMA 1000's own published recipes (madogdrikke.rema1000.dk/opskrifter),
 * fetched via `RemaRecipeSource` and cached here so the "best meals from
 * this week's offers" view doesn't re-scrape on every page load. Separate
 * from the hand-authored recipe catalog (`app/domain/recipes/recipeCatalog.ts`),
 * which stays code-only.
 */
export const externalRecipes = pgTable("external_recipes", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  url: text("url").notNull(),
  imageUrl: text("image_url"),
  description: text("description"),
  ingredients: jsonb("ingredients").notNull(),
  instructions: jsonb("instructions").notNull().default([]),
  servings: integer("servings"),
  totalTimeMinutes: integer("total_time_minutes"),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
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
  /** Denormalized display data for baseRecipeId (title/source/url/tags/ingredients), matching RecipeSnapshot. */
  recipeSnapshot: jsonb("recipe_snapshot").notNull(),
  adultVariant: jsonb("adult_variant").notNull(),
  childVariant: jsonb("child_variant").notNull(),
  isManualOverride: boolean("is_manual_override").notNull().default(false),
  editedAt: timestamp("edited_at", { withTimezone: true }).notNull().defaultNow(),
  /** Bumped on every write; drives ICS SEQUENCE for this day's VEVENT. */
  sequence: integer("sequence").notNull().default(0),
});
