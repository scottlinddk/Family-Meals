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
