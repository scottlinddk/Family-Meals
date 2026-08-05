/**
 * What a family has settled about a line on the shopping list.
 *
 *   * `checked` — it's in the trolley
 *   * `at_home` — don't buy it, there's already some in the cupboard or fridge
 *   * unmarked   — still to buy
 *
 * One state rather than two flags, because they're alternatives: something
 * already at home isn't going in the trolley, and ticking it off would mean
 * nothing.
 */
export type ShoppingListItemStatus = "checked" | "at_home";

export const SHOPPING_LIST_ITEM_STATUSES: readonly ShoppingListItemStatus[] = ["checked", "at_home"];

export interface ShoppingListMark {
  label: string;
  status: ShoppingListItemStatus;
}

/**
 * Reads a status off the wire. `null` is a real value — it clears the line's
 * mark — so an unusable one is `undefined`, which the routes answer 400 to
 * rather than guessing at.
 */
export function parseItemStatus(value: unknown): ShoppingListItemStatus | null | undefined {
  if (value === null) return null;
  return SHOPPING_LIST_ITEM_STATUSES.includes(value as ShoppingListItemStatus)
    ? (value as ShoppingListItemStatus)
    : undefined;
}

/** A mark that hasn't reached the server yet; `null` means "unmark this". */
export type PendingMarks = Readonly<Record<string, ShoppingListItemStatus | null>>;

/**
 * How the list should look right now: the server's marks with anything still
 * queued applied over them.
 *
 * The queue wins, always. A mark that hasn't been sent is still the most
 * recent thing the person did, and a poll landing mid-queue must not make the
 * line they just tapped flick back — that's the failure the shared version had
 * to avoid to be worth having.
 */
export function applyPendingMarks(
  serverMarks: readonly ShoppingListMark[],
  pending: PendingMarks,
): ReadonlyMap<string, ShoppingListItemStatus> {
  const marks = new Map(serverMarks.map((mark) => [mark.label, mark.status]));
  for (const [label, status] of Object.entries(pending)) {
    if (status) marks.set(label, status);
    else marks.delete(label);
  }
  return marks;
}

export interface ShoppingListProgress {
  /** Lines still to buy: neither in the trolley nor already at home. */
  remaining: number;
  inTrolley: number;
  atHome: number;
}

/**
 * Counted against the labels the list currently shows, so marks left behind by
 * a regenerated week — labels that no longer appear — can't shrink the count
 * of what's left to buy.
 */
export function shoppingListProgress(
  labels: readonly string[],
  marks: ReadonlyMap<string, ShoppingListItemStatus>,
): ShoppingListProgress {
  let inTrolley = 0;
  let atHome = 0;
  for (const label of labels) {
    const status = marks.get(label);
    if (status === "checked") inTrolley++;
    else if (status === "at_home") atHome++;
  }
  return { remaining: labels.length - inTrolley - atHome, inTrolley, atHome };
}
