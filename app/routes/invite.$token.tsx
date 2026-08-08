import { Link } from "react-router";
import type { Route } from "./+types/invite.$token";
import { requireUser } from "~/lib/auth";
import { familyInviteRepository } from "~/data/repositories/familyInviteRepository";
import { familyRepository } from "~/data/repositories/familyRepository";
import { AcceptInviteButton } from "~/ui/components/AcceptInviteButton";
import { TopNav } from "~/ui/components/TopNav";
import { t } from "~/i18n/t";

export async function loader({ request, params }: Route.LoaderArgs) {
  const headers = new Headers();
  const user = await requireUser(request, headers);
  const invite = await familyInviteRepository.getByToken(params.token!);
  const family = invite ? await familyRepository.getById(invite.familyId) : undefined;

  const isExpired = invite ? new Date(invite.expiresAt) < new Date() : false;
  const isUsable = !!invite && invite.status === "pending" && !isExpired;

  return {
    signedIn: !!user,
    familyName: family?.name ?? null,
    isUsable,
    status: invite?.status ?? null,
    isExpired,
  };
}

export default function InvitePage({ loaderData, params }: Route.ComponentProps) {
  const { signedIn, familyName, isUsable, status, isExpired } = loaderData;
  const token = params.token!;
  const redirectTo = `/invite/${token}`;

  return (
    <>
      {/* Signed-in visitors keep the app's nav here, so a stale or already-used
          invite link isn't a dead end they have to back out of. */}
      {signedIn && <TopNav />}

      <main className="mx-auto flex max-w-sm flex-col justify-center gap-5 p-8 text-center min-h-[70vh]">
        <div>
          <p className="text-sm text-muted">{t("app.title")}</p>
          <h1 className="mt-1 text-2xl">{t("invite.heading", { family: familyName ?? t("invite.aFamily") })}</h1>
        </div>

        {!isUsable && (
          <p className="text-sm text-red-700">
            {status === "revoked"
              ? t("invite.revoked")
              : isExpired
                ? t("invite.expired")
                : status === "accepted"
                  ? t("invite.alreadyAccepted")
                  : t("invite.notFound")}
          </p>
        )}

        {isUsable && !signedIn && (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted">{t("invite.signInPrompt")}</p>
            <Link
              to={`/auth/signup?redirectTo=${encodeURIComponent(redirectTo)}`}
              viewTransition
              className="text-accent hover:text-accent-700"
            >
              {t("auth.signup.submit")}
            </Link>
            <Link
              to={`/auth/login?redirectTo=${encodeURIComponent(redirectTo)}`}
              viewTransition
              className="text-accent hover:text-accent-700"
            >
              {t("auth.login.submit")}
            </Link>
          </div>
        )}

        {isUsable && signedIn && <AcceptInviteButton token={token} />}
      </main>
    </>
  );
}
