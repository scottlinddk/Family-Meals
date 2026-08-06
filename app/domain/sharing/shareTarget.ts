import { mondayOf } from "~/lib/time";

/**
 * What a `/share/{token}` link points at.
 *
 * Three things in this app are worth sending to someone: the week's dinners,
 * one evening's dinner, and a recipe. They're one type rather than three
 * share features because everything around the link is identical — issue,
 * reuse, revoke, and a read-only page for whoever opens it — and only the
 * payload differs.
 *
 * A day is identified by its *date*, not by its index in the week: the index
 * is a position on a page, while the date is what the day plan is actually
 * keyed by, so a link stays pointed at Wednesday even after the week is
 * regenerated around it.
 */
export type ShareKind = "week" | "day" | "recipe";

export type ShareTarget =
  | { kind: "week"; weekStartDate: string }
  | { kind: "day"; date: string }
  | { kind: "recipe"; recipeId: string };

export const SHARE_KINDS: ShareKind[] = ["week", "day", "recipe"];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** The week a shared thing belongs to, or null for a recipe (which belongs to no week). */
export function weekStartDateOf(target: ShareTarget): string | null {
  switch (target.kind) {
    case "week":
      return target.weekStartDate;
    case "day":
      return mondayOf(target.date);
    case "recipe":
      return null;
  }
}

/**
 * Reads a share target out of untrusted input — a query string on the way in,
 * a JSON body on the way to being issued.
 *
 * Returns `undefined` rather than throwing on anything malformed, so the
 * routes answer 400 instead of 500. Dates are shape-checked here because they
 * end up in a `date` column, and "next-week" is not a date.
 */
export function parseShareTarget(input: {
  kind?: string | null;
  weekStartDate?: string | null;
  date?: string | null;
  recipeId?: string | null;
}): ShareTarget | undefined {
  switch (input.kind) {
    case "week":
      return input.weekStartDate && ISO_DATE.test(input.weekStartDate)
        ? { kind: "week", weekStartDate: input.weekStartDate }
        : undefined;
    case "day":
      return input.date && ISO_DATE.test(input.date) ? { kind: "day", date: input.date } : undefined;
    case "recipe":
      return input.recipeId ? { kind: "recipe", recipeId: input.recipeId } : undefined;
    default:
      return undefined;
  }
}

/** The target as query parameters, for the hook that asks whether a link already exists. */
export function shareTargetToQuery(target: ShareTarget): Record<string, string> {
  switch (target.kind) {
    case "week":
      return { kind: "week", weekStartDate: target.weekStartDate };
    case "day":
      return { kind: "day", date: target.date };
    case "recipe":
      return { kind: "recipe", recipeId: target.recipeId };
  }
}

/** Stable identity for caching, so two components sharing the same thing share one query. */
export function shareTargetKey(target: ShareTarget): string {
  const query = shareTargetToQuery(target);
  return `${query.kind}:${query.weekStartDate ?? query.date ?? query.recipeId}`;
}
