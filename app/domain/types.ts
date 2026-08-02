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
 */
export interface AdultVariant {
  baseRecipeId: string;
  substitutions: Substitution[];
  portioningNotes: string[];
  estimatedCalories?: number;
}

/**
 * Base recipe plus a calorie-dense addition for the toddler, so their
 * calories are never reduced by the adults' calorie-cutting. Never
 * inherits AdultVariant substitutions.
 */
export interface ChildVariant {
  baseRecipeId: string;
  additions: Ingredient[];
  textureNotes: string[];
  saltSugarNotes: string[];
  estimatedCalories?: number;
}

export type MealSlot = "dinner";

export interface DayPlan {
  /** ISO date (yyyy-mm-dd), Europe/Copenhagen. */
  date: string;
  mealSlot: MealSlot;
  baseRecipeId: string;
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
  ingredients: string[];
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
