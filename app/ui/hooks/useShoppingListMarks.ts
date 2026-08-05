import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  applyPendingMarks,
  type PendingMarks,
  type ShoppingListItemStatus,
  type ShoppingListMark,
} from "~/domain/planning/shoppingListMarks";
import { SCHEMA_OUT_OF_DATE_STATUS, SchemaOutOfDateError } from "~/lib/dbErrors";

/**
 * Whose marks these are: a signed-in member looking at their family's week,
 * or whoever holds the `/list/{token}` share link. Both end up writing the
 * same family-scoped rows — the scope only decides which URL says so.
 */
export type MarksScope =
  | { kind: "week"; weekStart: string }
  | { kind: "share"; token: string };

function scopeKey(scope: MarksScope): string {
  return scope.kind === "week" ? `week:${scope.weekStart}` : `share:${scope.token}`;
}

function endpoint(scope: MarksScope): string {
  return scope.kind === "week"
    ? `/api/weeks/${scope.weekStart}/shopping-list/marks`
    : `/api/shopping-list/${scope.token}/marks`;
}

/* -------------------------------------------------------------------------
 * The pending queue
 *
 * Marking things off happens in a shop, which is exactly where the signal
 * isn't. Before these marks were shared they lived in `localStorage` and so
 * never needed a network at all; making them shared must not quietly hand
 * that back. So a mark is written to a small local queue first, applied to
 * the screen immediately, and sent when there's a connection — on the next
 * mark, when the tab comes back, or when the browser says it's online again.
 *
 * The queue is per scope and holds the *intent* per label, not a history:
 * tapping the same line four times leaves one entry, which is the only sane
 * thing to replay against a set of marks.
 * ---------------------------------------------------------------------- */

const NO_PENDING: PendingMarks = {};
const NO_MARKS: readonly ShoppingListMark[] = [];

function pendingStorageKey(key: string): string {
  return `family-meals:pending-marks:${key}`;
}

const listeners = new Set<() => void>();

/**
 * `useSyncExternalStore` calls `getSnapshot` on every render and loops if the
 * identity changes, so the parsed object is cached against the raw string it
 * came from and only rebuilt when that actually differs.
 */
const snapshots = new Map<string, { raw: string | null; value: PendingMarks }>();

function readRaw(key: string): string | null {
  try {
    return window.localStorage.getItem(pendingStorageKey(key));
  } catch {
    return null;
  }
}

function readPending(key: string): PendingMarks {
  const raw = readRaw(key);
  const cached = snapshots.get(key);
  if (cached && cached.raw === raw) return cached.value;

  let value: PendingMarks;
  try {
    value = raw ? (JSON.parse(raw) as PendingMarks) : NO_PENDING;
  } catch {
    value = NO_PENDING;
  }
  snapshots.set(key, { raw, value });
  return value;
}

function writePending(key: string, next: PendingMarks): void {
  try {
    if (Object.keys(next).length === 0) window.localStorage.removeItem(pendingStorageKey(key));
    else window.localStorage.setItem(pendingStorageKey(key), JSON.stringify(next));
  } catch {
    // Private browsing or a full quota. The mark still applies for this visit
    // — it just won't survive the page being closed before it's sent.
  }
  snapshots.set(key, { raw: readRaw(key), value: next });
  for (const listener of listeners) listener();
}

function queueMark(key: string, label: string, status: ShoppingListItemStatus | null): void {
  writePending(key, { ...readPending(key), [label]: status });
}

/**
 * Drops a sent mark — but only if it still says what was sent. A tap that
 * happened while the request was in flight has already overwritten the entry
 * with a newer intent, and that one still needs sending.
 */
function dropSentMark(key: string, label: string, sent: ShoppingListItemStatus | null): void {
  const pending = readPending(key);
  if (!(label in pending) || pending[label] !== sent) return;
  const rest = { ...pending };
  delete rest[label];
  writePending(key, rest);
}

function subscribeToPending(listener: () => void): () => void {
  listeners.add(listener);
  // Another tab in the same shop marking the same list should show up here.
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

/** One flush at a time per scope, so a retry can't race the send it retries. */
const flushing = new Set<string>();

async function readMarks(res: Response): Promise<ShoppingListMark[]> {
  const body = (await res.json()) as { marks?: unknown };
  return Array.isArray(body.marks) ? (body.marks as ShoppingListMark[]) : [];
}

/* ---------------------------------------------------------------------- */

export interface ShoppingListMarks {
  /** How each line stands right now: the server's marks with anything still queued applied on top. */
  marks: ReadonlyMap<string, ShoppingListItemStatus>;
  /** Sets a line's mark, or clears it with `null`. */
  setMark: (label: string, status: ShoppingListItemStatus | null) => void;
  /** Taps the mark on or off again, which is what every control on the row does. */
  toggleMark: (label: string, status: ShoppingListItemStatus) => void;
  /** Unmarks everything (signed-in members only — see `clearSupported`). */
  clear: (labels?: string[]) => void;
  clearSupported: boolean;
  /** How many marks haven't reached the server yet. */
  pendingCount: number;
  /** True once a mark was refused outright (not merely undelivered). */
  saveFailed: boolean;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
}

/**
 * The family's marks on one week's shopping list — what's in the trolley, and
 * what there's already some of at home.
 *
 * Shared state, on purpose and in reverse of where this started: two people
 * shopping the same list — one in the fruit aisle, one at the freezers — need
 * to see what the other has already put in the trolley, and the person
 * actually in the shop is often the one holding a share link rather than an
 * account. The server's marks are therefore the truth, polled while the page
 * is on screen so the other shopper's appear without anyone refreshing.
 *
 * What stays local is only *delivery*: see the pending queue above.
 */
export function useShoppingListMarks(scope: MarksScope): ShoppingListMarks {
  const key = scopeKey(scope);
  const url = endpoint(scope);
  const queryClient = useQueryClient();
  // Stable identity, so the flush below (and the listeners that call it) only
  // get rebuilt when the scope actually changes.
  const queryKey = useMemo(() => ["shopping-list-marks", key] as const, [key]);
  const [saveFailed, setSaveFailed] = useState(false);

  const server = useQuery({
    queryKey,
    queryFn: async (): Promise<ShoppingListMark[]> => {
      const res = await fetch(url);
      if (res.status === SCHEMA_OUT_OF_DATE_STATUS) throw new SchemaOutOfDateError();
      if (!res.ok) throw new Error("Failed to load shopping list marks");
      return readMarks(res);
    },
    // The one query in this app that genuinely is live: someone else is
    // marking the same list from the other end of the shop.
    staleTime: 0,
    refetchInterval: 20_000,
    refetchIntervalInBackground: false,
  });

  const pending = useSyncExternalStore(
    subscribeToPending,
    useCallback(() => readPending(key), [key]),
    () => NO_PENDING,
  );

  const flush = useCallback(async () => {
    if (flushing.has(key)) return;
    flushing.add(key);

    try {
      for (;;) {
        const entries = Object.entries(readPending(key));
        const next = entries[0];
        if (!next) return;
        const [label, status] = next;

        let res: Response;
        try {
          res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ label, status }),
          });
        } catch {
          // No connection. Keep the queue exactly as it is and try again on
          // the next mark, focus, or `online` event.
          return;
        }

        if (!res.ok) {
          // A refusal (revoked link, signed out, schema behind the code) will
          // be refused again, so the mark is dropped rather than jamming the
          // queue behind it — and said out loud, since the screen is showing
          // a mark the family's list doesn't have.
          dropSentMark(key, label, status);
          setSaveFailed(true);
          continue;
        }

        const marks = await readMarks(res);
        dropSentMark(key, label, status);
        // The response carries the family's whole set, so a phone that has
        // been offline catches up on everyone else's marks here too.
        queryClient.setQueryData(queryKey, marks);
        setSaveFailed(false);
      }
    } finally {
      flushing.delete(key);
    }
  }, [key, url, queryKey, queryClient]);

  // Send whatever is queued whenever there's a reason to think it can get
  // through: on arrival, when the browser reports a connection, and when the
  // tab comes back (which is also when the phone came out of a pocket).
  useEffect(() => {
    void flush();
    const onOnline = () => void flush();
    const onVisible = () => {
      if (document.visibilityState === "visible") void flush();
    };
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [flush, key]);

  const marks = useMemo(
    () => applyPendingMarks(server.data ?? NO_MARKS, pending),
    [server.data, pending],
  );

  const setMark = useCallback(
    (label: string, status: ShoppingListItemStatus | null) => {
      setSaveFailed(false);
      queueMark(key, label, status);
      void flush();
    },
    [key, flush],
  );

  const toggleMark = useCallback(
    (label: string, status: ShoppingListItemStatus) => {
      setMark(label, marks.get(label) === status ? null : status);
    },
    [marks, setMark],
  );

  /**
   * Resetting is the one action that isn't queued for later. It's done at the
   * kitchen table before a shop, not in an aisle on a dead connection, and
   * replaying "unmark everything" against a list two other people have been
   * marking since is a good way to undo their work. So it goes straight to
   * the server and reports if it didn't land.
   */
  const clear = useCallback(
    async (labels?: string[]) => {
      if (scope.kind !== "week") return;
      setSaveFailed(false);
      try {
        const res = await fetch(url, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ labels }),
        });
        if (!res.ok) throw new Error("Failed to clear shopping list marks");
        writePending(key, NO_PENDING);
        queryClient.setQueryData(queryKey, await readMarks(res));
      } catch {
        setSaveFailed(true);
      }
    },
    [scope.kind, url, key, queryKey, queryClient],
  );

  return {
    marks,
    setMark,
    toggleMark,
    clear,
    clearSupported: scope.kind === "week",
    pendingCount: Object.keys(pending).length,
    saveFailed,
    isLoading: server.isLoading,
    isError: server.isError,
    error: server.error,
  };
}
