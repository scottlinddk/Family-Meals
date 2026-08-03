import { useState } from "react";
import { Link, redirect } from "react-router";
import type { Route } from "./+types/family";
import { requireUser } from "~/lib/auth";
import {
  useFamilyMembers,
  useFamilyInvites,
  useCreateInvite,
  useRevokeInvite,
  useRenameFamily,
  useMyFamilies,
  useSwitchFamily,
} from "~/ui/hooks/useFamily";
import { useIcsUrl } from "~/ui/hooks/useIcsUrl";
import { Card, CardTitle } from "~/ui/components/ui/Card";
import { Button } from "~/ui/components/ui/Button";
import { Input } from "~/ui/components/ui/Input";
import { t } from "~/i18n/t";

export async function loader({ request }: Route.LoaderArgs) {
  const headers = new Headers();
  const user = await requireUser(request, headers);
  if (!user) return redirect("/auth/login", { headers });
  return null;
}

export default function FamilyPage() {
  const family = useIcsUrl();
  const members = useFamilyMembers();
  const invites = useFamilyInvites();
  const createInvite = useCreateInvite();
  const revokeInvite = useRevokeInvite();
  const renameFamily = useRenameFamily();
  const myFamilies = useMyFamilies();
  const switchFamily = useSwitchFamily();
  const [email, setEmail] = useState("");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [name, setName] = useState("");

  return (
    <main className="mx-auto max-w-2xl p-6">
      <Link to="/" className="text-sm text-accent hover:text-accent-700">
        {t("offers.backToPlan")}
      </Link>
      <h1 className="mt-3 mb-5 text-3xl">{t("family.pageTitle")}</h1>

      {(myFamilies.data?.length ?? 0) > 1 && (
        <Card className="mb-5">
          <CardTitle>{t("family.yourFamiliesHeading")}</CardTitle>
          <ul className="m-0 list-none p-0 text-sm">
            {myFamilies.data!.map((f) => (
              <li key={f.id} className="flex items-center justify-between border-b border-divider py-1.5 last:border-0">
                <span>{f.name ?? t("family.namePlaceholder")}</span>
                {f.active ? (
                  <span className="text-xs text-muted uppercase">{t("family.active")}</span>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => switchFamily.mutate(f.id)}
                    disabled={switchFamily.isPending}
                  >
                    {t("family.switch")}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="mb-5">
        <CardTitle>{t("family.nameHeading")}</CardTitle>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            renameFamily.mutate(name);
          }}
        >
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={family.data?.name ?? t("family.namePlaceholder")}
          />
          <Button type="submit" variant="secondary" disabled={renameFamily.isPending || !name.trim()}>
            {renameFamily.isPending ? t("family.saving") : t("family.save")}
          </Button>
        </form>
      </Card>

      <Card className="mb-5">
        <CardTitle>{t("family.membersHeading")}</CardTitle>
        {members.isLoading && <p className="text-muted">{t("week.loading")}</p>}
        <ul className="m-0 list-none p-0 text-sm">
          {members.data?.map((member) => (
            <li key={member.id} className="flex items-center justify-between border-b border-divider py-1.5 last:border-0">
              <span>{member.email ?? member.userId}</span>
              <span className="text-xs text-muted uppercase">{member.role}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <CardTitle>{t("family.inviteHeading")}</CardTitle>
        <p className="m-0 text-sm opacity-80">{t("family.inviteDescription")}</p>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            createInvite.mutate(email, {
              onSuccess: (invite) => {
                setInviteLink(`${window.location.origin}/invite/${invite.token}`);
                setEmail("");
              },
            });
          }}
        >
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="familie@example.com"
            required
          />
          <Button type="submit" variant="primary" disabled={createInvite.isPending}>
            {createInvite.isPending ? t("family.inviting") : t("family.invite")}
          </Button>
        </form>
        {createInvite.isError && <p className="text-sm text-red-700">{createInvite.error.message}</p>}
        {inviteLink && (
          <div className="rounded-md border border-divider bg-bg p-2 font-mono text-xs break-all">{inviteLink}</div>
        )}

        {!!invites.data?.length && (
          <ul className="m-0 mt-2 list-none p-0 text-sm">
            {invites.data.map((invite) => (
              <li key={invite.id} className="flex items-center justify-between border-b border-divider py-1.5 last:border-0">
                <span>{invite.email}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => revokeInvite.mutate(invite.id)}
                  disabled={revokeInvite.isPending}
                >
                  {t("family.revoke")}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </main>
  );
}
