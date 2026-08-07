import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  doublePrecision,
  index,
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

export const cookViewMode = pgEnum("cook_view_mode", ["steps", "all"]);

/**
 * Per-user view preferences, keyed by Supabase Auth user id rather than by
 * family: two people cooking the same plan can want different layouts, and
 * the choice should follow the person to their other devices. One row per
 * user (the id is the primary key), written by upsert, and absent until
 * someone changes something away from the defaults.
 */
export const userPreferences = pgTable("user_preferences", {
  userId: uuid("user_id").primaryKey(),
  /** How cook mode lays a recipe out — see `app/domain/preferences.ts`. */
  cookViewMode: cookViewMode("cook_view_mode").notNull().default("steps"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
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
  (table) => [
    unique("family_members_family_id_user_id_unique").on(table.familyId, table.userId),
    // Every authenticated request resolves the active family from the user id.
    index("family_members_user_id_idx").on(table.userId),
  ],
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

export const offerSnapshotSource = pgEnum("offer_snapshot_source", ["manual", "etilbudsavis"]);

/**
 * One offer import for one store, owned by the family that made it.
 *
 * Offers are family-scoped rather than global: which offers apply depends on
 * the family's stores and when they imported, and a shared table meant one
 * family's import replaced everyone else's. Scoped to a single `storeId`
 * rather than holding a mixed multi-store batch: `offerRepository.replaceCurrentOffers`
 * replaces "the latest snapshot for this family+store" wholesale, and keeping
 * one store per snapshot means refreshing (or failing to refresh) Netto can
 * never disturb Rema's still-current data. Snapshots are also kept rather
 * than overwritten, so `week_plans.offer_snapshot_id` points at the exact
 * offer set a plan was generated from and stays resolvable after the next
 * import.
 */
export const offerSnapshots = pgTable(
  "offer_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    familyId: uuid("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    /** Defaults to "rema1000" so pre-existing snapshots stay valid once this column lands. */
    storeId: text("store_id").notNull().default("rema1000"),
    source: offerSnapshotSource("source").notNull(),
    offerCount: integer("offer_count").notNull(),
    /** Earliest `validFrom` / latest `validUntil` across the snapshot's offers. */
    validFrom: timestamp("valid_from", { withTimezone: true }),
    validUntil: timestamp("valid_until", { withTimezone: true }),
    importedAt: timestamp("imported_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("offer_snapshots_family_id_imported_at_idx").on(table.familyId, table.importedAt),
    // "Latest snapshot" now resolves per (family, store).
    index("offer_snapshots_family_id_store_id_imported_at_idx").on(
      table.familyId,
      table.storeId,
      table.importedAt,
    ),
  ],
);

/** Weekly offers belonging to one import (see `offerSnapshots`). */
export const offers = pgTable(
  "offers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    snapshotId: uuid("snapshot_id")
      .notNull()
      .references(() => offerSnapshots.id, { onDelete: "cascade" }),
    /** Defaults to "rema1000" so pre-existing rows stay valid once this column lands. */
    storeId: text("store_id").notNull().default("rema1000"),
    /** True for a chain's member-only tier (Netto+, Føtex+) rather than a regular offer. */
    memberOnly: boolean("member_only").notNull().default(false),
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
  },
  (table) => [
    index("offers_snapshot_id_idx").on(table.snapshotId),
    index("offers_snapshot_id_store_id_idx").on(table.snapshotId, table.storeId),
  ],
);

/**
 * A family's store preferences: which supermarkets they shop at, and which
 * of those they hold a paid member tier for (Netto+, Føtex+). Kept as its
 * own small table, keyed by family rather than by user — like `userPreferences`,
 * a missing row is the normal state for a family that hasn't changed anything
 * and reads back as the defaults (all four stores, no memberships).
 */
export const familyStoreSettings = pgTable("family_store_settings", {
  familyId: uuid("family_id")
    .primaryKey()
    .references(() => families.id, { onDelete: "cascade" }),
  /** Store ids this family shops at. */
  selectedStores: jsonb("selected_stores")
    .notNull()
    .default(sql`'["rema1000","netto","foetex","meny"]'::jsonb`),
  /** Store ids whose member-only tier this family holds. */
  memberStores: jsonb("member_stores").notNull().default(sql`'[]'::jsonb`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
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
  /** Meal-theme slugs from the source site, e.g. `["aftensmad", "frokost"]`. */
  tags: jsonb("tags").notNull().default([]),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * What a family has settled about a shopping-list line:
 *
 *   * `checked` — it's in the trolley
 *   * `at_home` — don't buy it, there's already some in the cupboard or fridge
 *
 * One state, not two flags, because they're alternatives: something already at
 * home isn't going in the trolley, and ticking it off would mean nothing.
 * Unmarking deletes the row, so "no row" is the default (still to buy) and the
 * table only holds lines someone has actually decided something about.
 */
export const shoppingListItemStatus = pgEnum("shopping_list_item_status", ["checked", "at_home"]);

/**
 * One row per marked shopping-list line.
 *
 * Keyed by family and week rather than by user: two people shopping the same
 * list — one in the fruit aisle, one at the freezers — need to see each
 * other's ticks, which is the whole reason this moved out of `localStorage`.
 * `markedByUserId` is nullable because a share-link visitor (see
 * `shoppingListShares`) has no account.
 *
 * Per *week*, including the at-home marks: "we've got flour" is a fact about
 * one shopping trip, and by next week it may not be true any more. A standing
 * pantry that remembers staples across weeks would have to track what gets
 * used up to stay honest, and a stale "we have this" is worse than marking it
 * again — so this stays a decision about the trip in front of you.
 *
 * The item is identified by its *label* — the ingredient line as the recipe
 * wrote it, which is what `buildShoppingList` already merges items on. The
 * list is derived fresh from the week plan on every request and has no stable
 * item ids to reference, so a regenerated week simply leaves marks whose
 * label no longer appears; they're ignored on read rather than cleaned up.
 */
export const shoppingListMarks = pgTable(
  "shopping_list_marks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    familyId: uuid("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    weekStartDate: date("week_start_date").notNull(),
    itemLabel: text("item_label").notNull(),
    status: shoppingListItemStatus("status").notNull().default("checked"),
    /** Null when the mark came from a share link rather than a signed-in member. */
    markedByUserId: uuid("marked_by_user_id"),
    markedAt: timestamp("marked_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Marking is an idempotent upsert on this key: two members tapping the
    // same line at the same moment must not produce two rows.
    unique("shopping_list_marks_family_week_label_unique").on(
      table.familyId,
      table.weekStartDate,
      table.itemLabel,
    ),
    index("shopping_list_marks_family_id_week_start_date_idx").on(
      table.familyId,
      table.weekStartDate,
    ),
  ],
);

/**
 * One row per ingredient↔offer pairing a family has flagged as wrong.
 *
 * `ingredientOfferScore.ts` matches ingredient lines to offer names with
 * Danish-compound heuristics, and it will never be perfect — "chili" (the
 * fresh pepper) and "Go-Tan chili saucer" (a sauce) share a word but aren't
 * the same product, and no tokenizer rule can know that. Rather than block on
 * getting every edge case right in code, a family can flag a specific match
 * as wrong and it's excluded from then on.
 *
 * Keyed by free-text `(familyId, ingredientLabel, offerName)`, the same
 * identity choice as `shoppingListMarks.itemLabel`: neither ingredients nor
 * offers have a stable id anywhere in the domain, so the label is the only
 * available key. A row's mere existence is the flag — there is no "force this
 * match" counterpart, since the report this solves is about false positives.
 */
export const ingredientOfferOverrides = pgTable(
  "ingredient_offer_overrides",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    familyId: uuid("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    ingredientLabel: text("ingredient_label").notNull(),
    offerName: text("offer_name").notNull(),
    /** Null when the flag came from a share link rather than a signed-in member. */
    createdByUserId: uuid("created_by_user_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("ingredient_offer_overrides_family_ingredient_offer_unique").on(
      table.familyId,
      table.ingredientLabel,
      table.offerName,
    ),
    index("ingredient_offer_overrides_family_id_idx").on(table.familyId),
  ],
);

/**
 * One row per ingredient a family added to the shopping list by hand, rather
 * than it being on the list because a recipe on the week's plan calls for it.
 *
 * The recipe suggestions panel shows meals that aren't necessarily part of
 * this week's plan, so "buy this" for one of their ingredients has nowhere
 * generated to land — `buildShoppingList` only ever walks `week.days`. This
 * table is that missing source: `shoppingListForWeek` merges its rows in
 * alongside the plan's ingredient lines, through the same per-product
 * merging `buildShoppingList` already does, so an item added here that a
 * recipe also calls for becomes one line, not two.
 *
 * Keyed and scoped exactly like `shoppingListMarks` — by family and week, on
 * the free-text label, since neither ingredients nor shopping list items have
 * a stable id anywhere in this app — for the same reason: a regenerated week
 * leaves rows whose label no longer matters, and that's fine, they simply
 * stop contributing a line rather than needing to be cleaned up.
 */
export const shoppingListExtraItems = pgTable(
  "shopping_list_extra_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    familyId: uuid("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    weekStartDate: date("week_start_date").notNull(),
    itemLabel: text("item_label").notNull(),
    /** Null when the item came from a share link rather than a signed-in member. */
    addedByUserId: uuid("added_by_user_id"),
    addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Adding is an idempotent upsert on this key: tapping "add to list" twice
    // for the same ingredient must not produce two rows.
    unique("shopping_list_extra_items_family_week_label_unique").on(
      table.familyId,
      table.weekStartDate,
      table.itemLabel,
    ),
    index("shopping_list_extra_items_family_id_week_start_date_idx").on(
      table.familyId,
      table.weekStartDate,
    ),
  ],
);

/**
 * A `/list/{token}` link handing one week's shopping list to someone without
 * an account — the partner doing the shopping, a parent picking things up on
 * the way over.
 *
 * Scoped to a single week, not to the family as a whole: a shopping link is
 * for one shop, and next week's plan shouldn't leak through a link shared
 * once. Holders can tick items off (that's the point of sending it), but the
 * link exposes nothing else — no plan editing, no other weeks, no account.
 * Revoking sets `revokedAt`; the row is kept so a revoked token stays
 * permanently dead rather than becoming re-issuable.
 */
export const shoppingListShares = pgTable(
  "shopping_list_shares",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    familyId: uuid("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    weekStartDate: date("week_start_date").notNull(),
    token: text("token").notNull().unique(),
    createdByUserId: uuid("created_by_user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => [
    index("shopping_list_shares_family_id_week_start_date_idx").on(
      table.familyId,
      table.weekStartDate,
    ),
  ],
);

export const planShareKind = pgEnum("plan_share_kind", ["week", "day", "recipe"]);

/**
 * A `/share/{token}` link handing one *read-only* thing to someone outside
 * the family: the week's dinners, one evening's dinner, or a recipe.
 *
 * Same bearer-URL model as `shoppingListShares` and the ICS feed — the token
 * is the whole credential, so it decides what is served and nothing about it
 * comes from the caller. Unlike the shopping-list link, holders can't write
 * anything at all: a plan someone was sent to look at is not a plan they
 * should be able to edit, and there is no equivalent of a tick box to make
 * shared state worth having.
 *
 * One row per kind rather than three tables, because everything around the
 * link — issue, reuse, revoke — is identical and only the payload differs.
 * The three target columns are nullable and exactly one is set per row
 * (see `ShareTarget` in `app/domain/sharing/shareTarget.ts`): a week share
 * carries `weekStartDate`, a day share the `dayDate` it is pinned to, and a
 * recipe share the `externalRecipes` id.
 *
 * Days are pinned by date rather than by their index in the week, so a link
 * sent for Wednesday still opens Wednesday after the week is regenerated
 * around it. Like the ICS feed, the page is computed fresh on every request
 * — the link shares the plan, not a copy of it, so a swapped dish shows up
 * for the person holding the link too.
 *
 * Revoking sets `revokedAt`; the row is kept so a revoked token stays
 * permanently dead rather than becoming re-issuable.
 */
export const planShares = pgTable(
  "plan_shares",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    familyId: uuid("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    kind: planShareKind("kind").notNull(),
    /** Set for `week` shares — the Monday the shared week starts on. */
    weekStartDate: date("week_start_date"),
    /** Set for `day` shares — the exact date whose dinner is shared. */
    dayDate: date("day_date"),
    /** Set for `recipe` shares — an `external_recipes.id`. */
    recipeId: text("recipe_id"),
    token: text("token").notNull().unique(),
    createdByUserId: uuid("created_by_user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => [index("plan_shares_family_id_kind_idx").on(table.familyId, table.kind)],
);

export const weekPlans = pgTable(
  "week_plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    familyId: uuid("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    weekStartDate: date("week_start_date").notNull(),
    /**
     * The offer import this plan was generated from — null when the family
     * had no offers at the time, so the plan is honestly marked as not
     * offer-aware rather than claiming a snapshot that never existed.
     */
    offerSnapshotId: uuid("offer_snapshot_id").references(() => offerSnapshots.id, {
      onDelete: "set null",
    }),
    generatorVersion: text("generator_version").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // One plan per family per week — two fast clicks on "Generate" used to be
    // able to create a second row that `getWeekPlan` would then pick between
    // arbitrarily.
    unique("week_plans_family_id_week_start_date_unique").on(table.familyId, table.weekStartDate),
  ],
);

/**
 * One row per planned dinner. `adultVariant`/`childVariant` are stored as
 * jsonb snapshots (matching the AdultVariant/ChildVariant domain shape) so
 * edits are self-contained per day and don't depend on the recipe catalog
 * having stayed unchanged since generation.
 */
export const dayPlans = pgTable(
  "day_plans",
  {
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
  },
  (table) => [index("day_plans_week_plan_id_idx").on(table.weekPlanId)],
);
