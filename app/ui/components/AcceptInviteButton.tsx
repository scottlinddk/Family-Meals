import { useAcceptInvite } from "~/ui/hooks/useFamilyInvite";
import { Button } from "~/ui/components/ui/Button";
import { t } from "~/i18n/t";

export function AcceptInviteButton({ token }: { token: string }) {
  const accept = useAcceptInvite(token);

  return (
    <div className="flex flex-col items-center gap-2">
      <Button type="button" variant="primary" onClick={() => accept.mutate()} disabled={accept.isPending}>
        {accept.isPending ? t("invite.accepting") : t("invite.accept")}
      </Button>
      {accept.isError && <p className="text-sm text-red-700">{accept.error.message}</p>}
    </div>
  );
}
