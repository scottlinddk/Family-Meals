import { useEffect, useState } from "react";
import { useCreateShare, useRevokeShare, useShare } from "~/ui/hooks/useShare";
import type { ShareKind, ShareTarget } from "~/domain/sharing/shareTarget";
import { ShareLink } from "~/ui/components/ShareLink";
import { Button } from "~/ui/components/ui/Button";
import { BottomSheet } from "~/ui/components/ui/BottomSheet";
import { SchemaOutOfDateError } from "~/lib/dbErrors";
import { t, type TranslationKey } from "~/i18n/t";

/**
 * "Send this to someone" — one button for the three things worth sending: a
 * week's dinners, one evening's dinner, a recipe.
 *
 * Pressing it opens the sheet *and* issues the link in the same gesture,
 * because wanting the link is the only reason to press it; a second "create"
 * step would be a dialog asking whether you meant what you just did. The link
 * that comes back is the live one if there already is one, so pressing share
 * again doesn't kill a link someone else is already holding.
 *
 * The sheet is where revoking lives too: taking a link back is rare enough
 * not to belong on the page, and specific enough that it should sit next to
 * the link it kills.
 */
export function ShareButton({
  target,
  className,
  size = "sm",
  variant = "secondary",
  block = false,
}: {
  target: ShareTarget;
  className?: string;
  size?: "sm" | "md";
  variant?: "primary" | "secondary" | "ghost";
  block?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const share = useShare(target);
  const createShare = useCreateShare(target);
  const revokeShare = useRevokeShare(target);

  const token = share.data?.token ?? null;
  const url = token && typeof window !== "undefined" ? `${window.location.origin}/share/${token}` : null;
  const failed = createShare.isError || revokeShare.isError || share.isError;
  const schemaOutOfDate = [createShare.error, revokeShare.error, share.error].some(
    (error) => error instanceof SchemaOutOfDateError,
  );

  // Issuing on open rather than on mount: a page full of day cards shouldn't
  // mint seven links nobody asked for. The pending/failed guards are what
  // stop the effect re-firing on its own state changes — a failure has to
  // stay a failure until the sheet is closed and opened again.
  const { mutate: issueLink, isPending: issuing, isError: issueFailed } = createShare;
  useEffect(() => {
    if (open && !token && !issuing && !issueFailed) issueLink();
  }, [open, token, issuing, issueFailed, issueLink]);

  const headingId = `share-sheet-${target.kind}`;

  // Closing forgets a failed attempt, so opening the sheet again is a real
  // retry rather than a re-showing of the error that stopped the last one.
  const close = () => {
    setOpen(false);
    createShare.reset();
    revokeShare.reset();
  };

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        block={block}
        className={className}
        onClick={() => setOpen(true)}
      >
        {t(SHARE_BUTTON_KEYS[target.kind])}
      </Button>

      <BottomSheet open={open} onClose={close} labelledBy={headingId}>
        <h2 id={headingId} className="text-lg font-bold">
          {t(SHARE_HEADING_KEYS[target.kind])}
        </h2>
        <p className="m-0 text-[13px] text-muted">{t(SHARE_DESCRIPTION_KEYS[target.kind])}</p>

        {url ? (
          <ShareLink url={url} title={t(SHARE_HEADING_KEYS[target.kind])} />
        ) : failed ? (
          <p className="m-0 text-sm text-red-700">
            {schemaOutOfDate ? t("week.schemaOutOfDate") : t("share.failed")}
          </p>
        ) : (
          <p className="m-0 text-sm text-muted">{t("share.creating")}</p>
        )}

        <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
          {url ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={revokeShare.isPending}
              onClick={() => revokeShare.mutate()}
            >
              {revokeShare.isPending ? t("share.revoking") : t("share.revoke")}
            </Button>
          ) : (
            <span />
          )}
          <Button type="button" variant="secondary" size="sm" onClick={close}>
            {t("share.close")}
          </Button>
        </div>
      </BottomSheet>
    </>
  );
}

/*
 * Each kind says what it is on the button, rather than everything saying
 * "Del": the word appears next to a week, a day and a recipe, and which one
 * is being sent is the only thing anyone needs to know before pressing it.
 */
const SHARE_BUTTON_KEYS: Record<ShareKind, TranslationKey> = {
  week: "share.button.week",
  day: "share.button.day",
  recipe: "share.button.recipe",
};

const SHARE_HEADING_KEYS: Record<ShareKind, TranslationKey> = {
  week: "share.heading.week",
  day: "share.heading.day",
  recipe: "share.heading.recipe",
};

const SHARE_DESCRIPTION_KEYS: Record<ShareKind, TranslationKey> = {
  week: "share.description.week",
  day: "share.description.day",
  recipe: "share.description.recipe",
};
