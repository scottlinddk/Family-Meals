import { useEffect, useState, useSyncExternalStore } from "react";
import {
  useCreateShoppingListShare,
  useRevokeShoppingListShare,
  useShoppingListShare,
} from "~/ui/hooks/useShoppingList";
import { Button } from "~/ui/components/ui/Button";
import { t } from "~/i18n/t";

/**
 * "Send the list to whoever's going to the shop."
 *
 * The link (`/list/{token}`) needs no account, which is the point: the person
 * standing in REMA is often the one who never signed up. They can tick items
 * off — the ticks are the shared part, and a list they could only read would
 * leave everyone else's copy wrong — but the link reaches one week's list and
 * nothing else, and can be taken back here.
 *
 * Collapsed to a single button until it's used, since most weeks nobody
 * shares anything and the list is what the page is for.
 */
export function ShareListPanel({ weekStart }: { weekStart: string }) {
  const share = useShoppingListShare(weekStart);
  const createShare = useCreateShoppingListShare(weekStart);
  const revokeShare = useRevokeShoppingListShare(weekStart);
  const [expanded, setExpanded] = useState(false);

  const token = share.data?.token ?? null;
  const url = token && typeof window !== "undefined" ? `${window.location.origin}/list/${token}` : null;

  // An existing link shows itself without being asked for: it means someone
  // may already be shopping from it, and that's worth knowing at a glance.
  const open = expanded || token !== null;

  if (!open) {
    return (
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={createShare.isPending}
        onClick={() => {
          setExpanded(true);
          createShare.mutate();
        }}
      >
        {createShare.isPending ? t("shoppingList.sharing") : t("shoppingList.share")}
      </Button>
    );
  }

  // Full width once it's open, so it wraps onto its own line under the
  // heading rather than squeezing in beside it.
  return (
    <div className="flex w-full flex-col gap-2 rounded-md border border-divider bg-surface p-4 shadow-sm">
      <p className="m-0 text-sm font-semibold">{t("shoppingList.shareHeading")}</p>
      <p className="m-0 text-xs text-muted">{t("shoppingList.shareDescription")}</p>

      {createShare.isError && <p className="m-0 text-sm text-red-700">{t("shoppingList.shareFailed")}</p>}

      {url ? (
        <>
          <ShareLink url={url} />
          <div className="flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={revokeShare.isPending}
              onClick={() => revokeShare.mutate()}
            >
              {revokeShare.isPending ? t("shoppingList.revoking") : t("shoppingList.revokeShare")}
            </Button>
          </div>
        </>
      ) : (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={createShare.isPending || share.isLoading}
            onClick={() => createShare.mutate()}
          >
            {createShare.isPending ? t("shoppingList.sharing") : t("shoppingList.createShare")}
          </Button>
        </div>
      )}
    </div>
  );
}

/** Browser capabilities don't change under us, so there's nothing to subscribe to. */
const subscribeToNothing = () => () => {};

/**
 * The link, with the two ways it actually gets sent: the phone's own share
 * sheet (straight into the message thread it belongs in) and a copy button
 * for everywhere else. `navigator.share` is absent on desktop and outside
 * secure contexts, so it's offered only when it exists.
 */
function ShareLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  // Whether the phone has a share sheet is something only the browser knows,
  // so it's read as an external value that never changes — with `false` for
  // the server render, which can't know and mustn't guess.
  const canNativeShare = useSyncExternalStore(
    subscribeToNothing,
    () => !!navigator.share,
    () => false,
  );

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-sm border border-divider bg-neutral-100 p-2.5 font-mono text-xs break-all">{url}</div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => {
            navigator.clipboard?.writeText(url).then(
              () => setCopied(true),
              () => setCopied(false),
            );
          }}
        >
          {t(copied ? "calendar.copied" : "calendar.copy")}
        </Button>
        {canNativeShare && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              // Rejects when the sheet is dismissed, which isn't a failure.
              void navigator.share({ title: t("shoppingList.title"), url }).catch(() => {});
            }}
          >
            {t("shoppingList.shareVia")}
          </Button>
        )}
      </div>
    </div>
  );
}
