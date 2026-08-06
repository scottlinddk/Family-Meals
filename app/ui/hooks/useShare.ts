import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SharedPlan } from "~/lib/sharedPlan";
import {
  shareTargetKey,
  shareTargetToQuery,
  type ShareTarget,
} from "~/domain/sharing/shareTarget";
import { SCHEMA_OUT_OF_DATE_STATUS, SchemaOutOfDateError } from "~/lib/dbErrors";

interface ShareToken {
  token: string | null;
}

function queryKey(target: ShareTarget) {
  return ["share", shareTargetKey(target)] as const;
}

async function readToken(res: Response, what: string): Promise<ShareToken> {
  if (res.status === SCHEMA_OUT_OF_DATE_STATUS) throw new SchemaOutOfDateError();
  if (!res.ok) throw new Error(`Failed to ${what} the share link`);
  return res.json();
}

/** The live `/share/{token}` link for this week/day/recipe, or `{ token: null }`. */
export function useShare(target: ShareTarget) {
  return useQuery({
    queryKey: queryKey(target),
    queryFn: async (): Promise<ShareToken> => {
      const query = new URLSearchParams(shareTargetToQuery(target));
      return readToken(await fetch(`/api/shares?${query}`), "load");
    },
  });
}

/**
 * Issues the link, or hands back the one that already exists — pressing
 * "share" a second time must not invalidate the link already sitting in
 * someone else's messages.
 */
export function useCreateShare(target: ShareTarget) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<ShareToken> =>
      readToken(
        await fetch("/api/shares", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(shareTargetToQuery(target)),
        }),
        "create",
      ),
    onSuccess: (data) => queryClient.setQueryData(queryKey(target), data),
  });
}

/** Kills the link, so the copy someone else holds stops working. */
export function useRevokeShare(target: ShareTarget) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<ShareToken> =>
      readToken(
        await fetch("/api/shares", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(shareTargetToQuery(target)),
        }),
        "revoke",
      ),
    onSuccess: (data) => queryClient.setQueryData(queryKey(target), data),
  });
}

/**
 * What a shared link points at, fetched with the token instead of a session.
 * Resolves to null when the token is unknown or has been revoked, which the
 * page shows as a dead link rather than as an error.
 */
export function useSharedPlan(token: string) {
  return useQuery({
    queryKey: ["shared-plan", token],
    queryFn: async (): Promise<SharedPlan | null> => {
      const res = await fetch(`/api/shared/${token}`);
      if (res.status === 404) return null;
      if (res.status === SCHEMA_OUT_OF_DATE_STATUS) throw new SchemaOutOfDateError();
      if (!res.ok) throw new Error("Failed to load the shared plan");
      return res.json();
    },
  });
}
