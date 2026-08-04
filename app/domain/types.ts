/**
 * Core domain types. Pure data shapes only — no React, no DB, no HTTP.
 * These mirror the architecture plan agreed with the user.
 */

export type CurrencyCode = "DKK";

/** Mirrors the REMA 1000 weekly-offer reference schema exactly. */
export interface Offer {
  name: string;
  unitSizeFrom: number;
  unitSizeTo: number;
  unitSymbol: string;
  price: number;
  currencyCode: CurrencyCode;
  unitPrice: number;
  baseUnit: string;
  departmentSlug: string;
  validFrom: string; // ISO 8601
  validUntil: string; // ISO 8601
}

export type ProteinType =
  | "beef"
  | "pork"
  | "chicken"
  | "fish"
  | "vegetarian";

export interface Ingredient {
  name: string;
  quantity: number;
  unit: string;
  /** Name of the matching offer, if this ingredient was selected because it's discounted this week. */
  offerMatch?: string;
}

/**
 * The single shared dish for a day. Adult and child variants are both
 * derived from this — the base itself is never shrunk to cut calories,
 * since that would flow through to the child variant too.
 */
export interface BaseRecipe {
  id: string;
  title: string;
  proteinType: ProteinType;
  tags: string[];
  ingredients: Ingredient[];
  instructions: string[];
  /** Local dinner time in Europe/Copenhagen, "HH:mm". */
  dinnerTimeLocal: string;
}

export interface Substitution {
  originalIngredient: string;
  substituteIngredient: string;
  reason: string;
}

/**
 * Calorie-minimized version of the base recipe for the two adults.
 * Achieved only through substitution/portioning notes layered on top of
 * the base — never by editing BaseRecipe.ingredients directly.
 *
 * `curated: false` means this recipe has no hand-authored guidance (e.g. it
 * was sourced from REMA 1000's own recipe site rather than the curated
 * catalog) — `portioningNotes` then holds a generic disclaimer instead of
 * dish-specific advice.
 */
export interface AdultVariant {
  baseRecipeId: string;
  substitutions: Substitution[];
  portioningNotes: string[];
  estimatedCalories?: number;
  curated: boolean;
}

/**
 * Base recipe plus a calorie-dense addition for the toddler, so their
 * calories are never reduced by the adults' calorie-cutting. Never
 * inherits AdultVariant substitutions.
 *
 * `curated: false` means no hand-authored calorie-dense addition exists for
 * this recipe — `additions` is empty and `saltSugarNotes`/`textureNotes`
 * hold a generic disclaimer instead of the usual guarantee.
 */
export interface ChildVariant {
  baseRecipeId: string;
  additions: Ingredient[];
  textureNotes: string[];
  saltSugarNotes: string[];
  estimatedCalories?: number;
  curated: boolean;
}

export type MealSlot = "dinner";

/**
 * Denormalized display data for `DayPlan.baseRecipeId`, snapshotted at
 * generation/swap time so day cards, the calendar feed, etc. don't need an
 * extra lookup (and stay correct even if the source recipe later changes).
 */
export interface RecipeSnapshot {
  title: string;
  source: "catalog" | "external";
  /** Link to the original recipe page, for externally-sourced recipes. */
  url?: string;
  imageUrl?: string;
  /** Short teaser/summary, so the day card reads without opening the source. */
  description?: string;
  /** Number of people the source recipe serves, if stated. */
  servings?: number;
  /** Total time to make the dish, in minutes, if stated. */
  totalTimeMinutes?: number;
  tags: string[];
  /** Ingredients as display lines (already formatted, no separate qty/unit). */
  ingredientLines: string[];
  /** Step-by-step method, in order, if the source recipe had one. */
  instructionLines: string[];
  /**
   * The subset of `ingredientLines` that was on offer when this day was
   * planned, for highlighting. Optional because day plans generated before
   * offer matching was snapshotted don't carry it.
   */
  offerIngredientLines?: string[];
}

export interface DayPlan {
  /** ISO date (yyyy-mm-dd), Europe/Copenhagen. */
  date: string;
  mealSlot: MealSlot;
  baseRecipeId: string;
  recipeSnapshot: RecipeSnapshot;
  adultVariant: AdultVariant;
  childVariant: ChildVariant;
  isManualOverride: boolean;
  editedAt: string; // ISO 8601
  /** Bumped on every edit/swap/regenerate; drives ICS SEQUENCE. */
  sequence: number;
}

export interface WeekPlan {
  familyId: string;
  /** ISO date of the Monday this week starts on, Europe/Copenhagen. */
  weekStartDate: string;
  days: DayPlan[];
  generatedFrom: {
    offerSnapshotId: string;
    generatorVersion: string;
  };
  createdAt: string;
  updatedAt: string;
}

/**
 * A recipe pulled from an external source (REMA 1000's own recipe site,
 * madogdrikke.rema1000.dk/opskrifter) rather than the hand-authored
 * `RECIPE_CATALOG`. Ingredients are kept as plain display strings — the
 * source page doesn't expose structured quantity/unit data — and are only
 * used for offer-matching (substring scoring), never fed into the
 * adult/child variant derivation pipeline built for `BaseRecipe`.
 */
export interface ExternalRecipe {
  /** Stable id derived from the source URL slug. */
  id: string;
  title: string;
  /** Canonical URL on madogdrikke.rema1000.dk. */
  url: string;
  imageUrl?: string;
  /** Short teaser/summary text from the recipe page, if present. */
  description?: string;
  ingredients: string[];
  /** Step-by-step method, in order, if the page exposes one. */
  instructions: string[];
  /** Number of people the recipe serves, if stated. */
  servings?: number;
  /** Total time to make the dish, in minutes, if stated. */
  totalTimeMinutes?: number;
}

/**
 * Static, non-personalized reminder for the ~6mo infant. Intentionally not
 * tied to any WeekPlan/DayPlan and never generated or turned into a VEVENT —
 * the infant is explicitly excluded from meal planning per the family's
 * pediatric-guidance constraint.
 */
export interface InfantNote {
  text: string;
}
