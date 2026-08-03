import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface FamilyMember {
  id: string;
  familyId: string;
  userId: string;
  role: "owner" | "member";
  joinedAt: string;
  email: string | null;
}

export interface MyFamily {
  id: string;
  name: string | null;
  role: "owner" | "member";
  active: boolean;
}

export interface FamilyInvite {
  id: string;
  familyId: string;
  email: string;
  token: string;
  status: "pending" | "accepted" | "revoked";
  createdAt: string;
  expiresAt: string;
}

const MEMBERS_QUERY_KEY = ["family-members"] as const;
const INVITES_QUERY_KEY = ["family-invites"] as const;
const MY_FAMILIES_QUERY_KEY = ["my-families"] as const;

export function useMyFamilies() {
  return useQuery({
    queryKey: MY_FAMILIES_QUERY_KEY,
    queryFn: async (): Promise<MyFamily[]> => {
      const res = await fetch("/api/family/mine");
      if (!res.ok) throw new Error("Failed to load your families");
      return res.json();
    },
  });
}

/** Switches the active family, then reloads so every family-scoped view refetches for it. */
export function useSwitchFamily() {
  return useMutation({
    mutationFn: async (familyId: string) => {
      const res = await fetch("/api/family/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ familyId }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Failed to switch family");
      return body;
    },
    onSuccess: () => {
      window.location.reload();
    },
  });
}

export function useFamilyMembers() {
  return useQuery({
    queryKey: MEMBERS_QUERY_KEY,
    queryFn: async (): Promise<FamilyMember[]> => {
      const res = await fetch("/api/family/members");
      if (!res.ok) throw new Error("Failed to load family members");
      return res.json();
    },
  });
}

export function useFamilyInvites() {
  return useQuery({
    queryKey: INVITES_QUERY_KEY,
    queryFn: async (): Promise<FamilyInvite[]> => {
      const res = await fetch("/api/family/invites");
      if (!res.ok) throw new Error("Failed to load family invites");
      return res.json();
    },
  });
}

export function useCreateInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (email: string): Promise<FamilyInvite> => {
      const res = await fetch("/api/family/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Failed to create invite");
      return body;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVITES_QUERY_KEY });
    },
  });
}

export function useRevokeInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/family/invites/${id}/revoke`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to revoke invite");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVITES_QUERY_KEY });
    },
  });
}

export function useRenameFamily() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch("/api/family", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("Failed to rename family");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["family"] });
    },
  });
}
