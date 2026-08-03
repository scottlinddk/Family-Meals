import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router";

interface AcceptInviteResponse {
  familyId: string;
}

/** Accepts a family invite by its token, then sends the user to their week view. */
export function useAcceptInvite(token: string) {
  const navigate = useNavigate();
  return useMutation({
    mutationFn: async (): Promise<AcceptInviteResponse> => {
      const res = await fetch(`/api/family/invites/${token}/accept`, { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Failed to accept invite");
      return body;
    },
    onSuccess: () => {
      navigate("/");
    },
  });
}
