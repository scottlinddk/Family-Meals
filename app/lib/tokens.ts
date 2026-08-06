import { nanoid } from "nanoid";

/**
 * Generates the unguessable per-family token embedded in the ICS
 * subscription URL. 32 nanoid characters over its default 64-char alphabet
 * is >180 bits of entropy — comfortably unguessable, and URL-safe so it
 * drops straight into a path segment.
 */
export function generateCalendarToken(): string {
  return nanoid(32);
}

/** Generates the unguessable token embedded in a `/invite/{token}` family-join link. */
export function generateInviteToken(): string {
  return nanoid(32);
}

/**
 * Generates the unguessable token embedded in a `/list/{token}` shopping-list
 * link. Same shape and strength as the calendar token, and the same bargain:
 * knowing the URL is the whole credential, so the link is scoped to one
 * week's list and revocable (see `shoppingListShareRepository`).
 */
export function generateShoppingListShareToken(): string {
  return nanoid(32);
}

/**
 * Generates the unguessable token embedded in a `/share/{token}` link — the
 * read-only week, day or recipe someone sends out of the app. Same shape and
 * strength as the tokens above, and the same bargain: the URL is the whole
 * credential, so it is scoped to exactly one thing and revocable (see
 * `planShareRepository`).
 */
export function generatePlanShareToken(): string {
  return nanoid(32);
}
