import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ShoppingList } from "~/domain/planning/shoppingList";
import { SCHEMA_OUT_OF_DATE_STATUS, SchemaOutOfDateError } from "~/lib/dbErrors";

export function shoppingListQueryKey(weekStart: string) {
  return ["shopping-list", weekStart] as const;
}

export function useShoppingList(weekStart: string) {
  return useQuery({
    queryKey: shoppingListQueryKey(weekStart),
    queryFn: async (): Promise<ShoppingList | null> => {
      const res = await fetch(`/api/weeks/${weekStart}/shopping-list`);
      if (res.status === 404) return null;
      if (res.status === SCHEMA_OUT_OF_DATE_STATUS) throw new SchemaOutOfDateError();
      if (!res.ok) throw new Error("Failed to load shopping list");
      return res.json();
    },
  });
}

export interface SharedShoppingList {
  weekStartDate: string;
  familyName: string | null;
  /** Null when the shared week has no plan (yet) — the link itself is still valid. */
  list: ShoppingList | null;
}

/**
 * The same list, fetched with a share token instead of a session. Resolves to
 * null when the token is unknown or has been revoked, which the page shows as
 * a dead link rather than as an error.
 */
export function useSharedShoppingList(token: string) {
  return useQuery({
    queryKey: ["shared-shopping-list", token],
    queryFn: async (): Promise<SharedShoppingList | null> => {
      const res = await fetch(`/api/shopping-list/${token}`);
      if (res.status === 404) return null;
      if (res.status === SCHEMA_OUT_OF_DATE_STATUS) throw new SchemaOutOfDateError();
      if (!res.ok) throw new Error("Failed to load shared shopping list");
      return res.json();
    },
  });
}

function shareQueryKey(weekStart: string) {
  return ["shopping-list-share", weekStart] as const;
}

/** The week's live `/list/{token}` link, or `{ token: null }` if it isn't shared. */
export function useShoppingListShare(weekStart: string) {
  return useQuery({
    queryKey: shareQueryKey(weekStart),
    queryFn: async (): Promise<{ token: string | null }> => {
      const res = await fetch(`/api/weeks/${weekStart}/shopping-list/share`);
      if (res.status === SCHEMA_OUT_OF_DATE_STATUS) throw new SchemaOutOfDateError();
      if (!res.ok) throw new Error("Failed to load the shopping list share link");
      return res.json();
    },
  });
}

/**
 * Issues the week's share link, or hands back the one that already exists —
 * pressing "share" a second time must not invalidate the link already sitting
 * in someone else's messages.
 */
export function useCreateShoppingListShare(weekStart: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<{ token: string | null }> => {
      const res = await fetch(`/api/weeks/${weekStart}/shopping-list/share`, { method: "POST" });
      if (res.status === SCHEMA_OUT_OF_DATE_STATUS) throw new SchemaOutOfDateError();
      if (!res.ok) throw new Error("Failed to create the shopping list share link");
      return res.json();
    },
    onSuccess: (data) => queryClient.setQueryData(shareQueryKey(weekStart), data),
  });
}

/** Kills the week's share link, so the copy someone else holds stops working. */
export function useRevokeShoppingListShare(weekStart: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<{ token: string | null }> => {
      const res = await fetch(`/api/weeks/${weekStart}/shopping-list/share`, { method: "DELETE" });
      if (res.status === SCHEMA_OUT_OF_DATE_STATUS) throw new SchemaOutOfDateError();
      if (!res.ok) throw new Error("Failed to revoke the shopping list share link");
      return res.json();
    },
    onSuccess: (data) => queryClient.setQueryData(shareQueryKey(weekStart), data),
  });
}
