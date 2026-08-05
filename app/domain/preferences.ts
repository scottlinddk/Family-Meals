/**
 * Per-user view preferences — how someone likes the app to look, as opposed
 * to what the family's plan says. Pure data, shared by the repository that
 * stores it, the route that serves it, and the hook that reads it.
 */

/**
 * How cook mode lays a recipe out.
 *
 * - `steps`: one step at a time, tapped through at the stove.
 * - `all`: the whole method on one scrollable page, for reading it through
 *   before starting or cooking from a glance without touching the phone.
 */
export const COOK_VIEW_MODES = ["steps", "all"] as const;

export type CookViewMode = (typeof COOK_VIEW_MODES)[number];

export interface UserPreferences {
  cookViewMode: CookViewMode;
}

/**
 * What everyone gets before they've chosen anything — and what's served when
 * the preferences table hasn't been migrated in yet, since an unsaved
 * preference and an unreachable one look the same from the kitchen.
 */
export const DEFAULT_USER_PREFERENCES: UserPreferences = { cookViewMode: "steps" };

/** Narrows untrusted input (a request body, a stored row) to a known mode. */
export function parseCookViewMode(value: unknown): CookViewMode | null {
  return COOK_VIEW_MODES.includes(value as CookViewMode) ? (value as CookViewMode) : null;
}
