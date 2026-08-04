import { useQuery } from "@tanstack/react-query";
import { useCallback, useSyncExternalStore } from "react";
import type { ShoppingList } from "~/domain/planning/shoppingList";

export function shoppingListQueryKey(weekStart: string) {
  return ["shopping-list", weekStart] as const;
}

export function useShoppingList(weekStart: string) {
  return useQuery({
    queryKey: shoppingListQueryKey(weekStart),
    queryFn: async (): Promise<ShoppingList | null> => {
      const res = await fetch(`/api/weeks/${weekStart}/shopping-list`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to load shopping list");
      return res.json();
    },
  });
}

function storageKey(weekStart: string): string {
  return `family-meals:shopping-checked:${weekStart}`;
}

const EMPTY: ReadonlySet<string> = new Set();

const listeners = new Set<() => void>();

/**
 * `useSyncExternalStore` calls `getSnapshot` on every render and loops if the
 * identity changes, so the parsed Set is cached against the raw string it
 * came from and only rebuilt when that actually differs.
 */
const snapshots = new Map<string, { raw: string | null; value: ReadonlySet<string> }>();

function readRaw(weekStart: string): string | null {
  try {
    return window.localStorage.getItem(storageKey(weekStart));
  } catch {
    return null;
  }
}

function readChecked(weekStart: string): ReadonlySet<string> {
  const raw = readRaw(weekStart);
  const cached = snapshots.get(weekStart);
  if (cached && cached.raw === raw) return cached.value;

  let value: ReadonlySet<string>;
  try {
    value = new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    value = EMPTY;
  }
  snapshots.set(weekStart, { raw, value });
  return value;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  // Another tab ticking the same list should be reflected here too.
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function writeChecked(weekStart: string, next: ReadonlySet<string>): void {
  try {
    window.localStorage.setItem(storageKey(weekStart), JSON.stringify([...next]));
  } catch {
    // Private browsing or a full quota — the tick still applies for this visit.
  }
  snapshots.set(weekStart, { raw: readRaw(weekStart), value: next });
  for (const listener of listeners) listener();
}

/**
 * Which items are ticked off, kept in `localStorage` per week.
 *
 * Deliberately client-side: ticking things off in the shop is a private,
 * high-frequency action that should work offline and never wait on a round
 * trip. It's also the one piece of state that shouldn't sync — two people
 * shopping different aisles want their own checkboxes. Read through
 * `useSyncExternalStore` so the server render (which has no localStorage)
 * starts empty and hydrates without a mismatch.
 */
export function useCheckedItems(weekStart: string) {
  const checked = useSyncExternalStore(
    subscribe,
    useCallback(() => readChecked(weekStart), [weekStart]),
    () => EMPTY,
  );

  const toggle = useCallback(
    (label: string) => {
      const next = new Set(readChecked(weekStart));
      if (!next.delete(label)) next.add(label);
      writeChecked(weekStart, next);
    },
    [weekStart],
  );

  const clear = useCallback(() => {
    try {
      window.localStorage.removeItem(storageKey(weekStart));
    } catch {
      // Nothing to clean up if it was never written.
    }
    snapshots.set(weekStart, { raw: null, value: EMPTY });
    for (const listener of listeners) listener();
  }, [weekStart]);

  return { checked, toggle, clear };
}
