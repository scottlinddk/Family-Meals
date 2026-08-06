import { useState } from "react";
import { Form } from "react-router";
import { useSignedInEmail } from "~/ui/hooks/useSignedInEmail";
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
import { SignOutIcon } from "~/ui/components/Icon";
import { t } from "~/i18n/t";

/**
 * "Bruger & familie": everything that's true about the person using the app
 * and the household they're planning for, rather than about any one page.
 *
 * Signing out lives here, at the top, rather than in the header band. It's a
 * once-in-a-blue-moon action that was taking a permanent slot on every screen
 * next to the calendar button — and it belongs with the account it ends.
 */
export default function FamilyPage() {
  const signedInEmail = useSignedInEmail();
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
    <>
      <h1 className="mb-4 text-2xl">{t("family.pageTitle")}</h1>

      <Card className="mb-5">
        <CardTitle>{t("family.accountHeading")}</CardTitle>
        {signedInEmail && (
          <p className="m-0 min-w-0 text-sm break-all text-muted">
            {t("family.signedInAs", { email: signedInEmail })}
          </p>
        )}
        <Form method="post" action="/auth/logout" className="mt-1">
          <Button type="submit" variant="secondary" size="sm">
            <SignOutIcon size={16} />
            {t("family.signOut")}
          </Button>
        </Form>
      </Card>

      {(myFamilies.data?.length ?? 0) > 1 && (
        <Card className="mb-5">
          <CardTitle>{t("family.yourFamiliesHeading")}</CardTitle>
          <ul className="m-0 list-none p-0 text-sm">
            {myFamilies.data!.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-3 border-b border-divider py-1.5 last:border-0">
                <span className="min-w-0">{f.name ?? t("family.namePlaceholder")}</span>
                {f.active ? (
                  <span className="text-xs text-muted uppercase">{t("family.active")}</span>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="shrink-0"
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
          className="flex flex-col gap-2 sm:flex-row"
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
            <li key={member.id} className="flex items-center justify-between gap-3 border-b border-divider py-1.5 last:border-0">
              {/* Emails and user ids are single unbreakable words, so the
                  line has to be allowed to shrink and wrap inside itself. */}
              <span className="min-w-0 break-all">{member.email ?? member.userId}</span>
              <span className="shrink-0 text-xs text-muted uppercase">{member.role}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <CardTitle>{t("family.inviteHeading")}</CardTitle>
        <p className="m-0 text-sm text-muted">{t("family.inviteDescription")}</p>
        <form
          className="flex flex-col gap-2 sm:flex-row"
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
          <div className="rounded-sm border border-divider bg-neutral-100 p-2.5 font-mono text-xs break-all">{inviteLink}</div>
        )}

        {!!invites.data?.length && (
          <ul className="m-0 mt-2 list-none p-0 text-sm">
            {invites.data.map((invite) => (
              <li key={invite.id} className="flex items-center justify-between gap-3 border-b border-divider py-1.5 last:border-0">
                <span className="min-w-0 break-all">{invite.email}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="shrink-0"
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
    </>
  );
}
