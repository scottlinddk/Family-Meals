import { useEffect, useState, useSyncExternalStore } from "react";
import { Button } from "~/ui/components/ui/Button";
import { t } from "~/i18n/t";

/** Browser capabilities don't change under us, so there's nothing to subscribe to. */
const subscribeToNothing = () => () => {};

/**
 * A share link, with the two ways it actually gets sent: the phone's own
 * share sheet (straight into the message thread it belongs in) and a copy
 * button for everywhere else. `navigator.share` is absent on desktop and
 * outside secure contexts, so it's offered only when it exists.
 *
 * Shared by every link the app hands out — the shopping list, a day, a week,
 * a recipe — so the one piece of this that's easy to get subtly wrong (a
 * share sheet that isn't there, a clipboard write that quietly failed) is
 * only written once.
 */
export function ShareLink({ url, title }: { url: string; title: string }) {
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
      <div className="rounded-sm border border-divider bg-neutral-100 p-2.5 font-mono text-xs break-all">
        {url}
      </div>
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
              void navigator.share({ title, url }).catch(() => {});
            }}
          >
            {t("shoppingList.shareVia")}
          </Button>
        )}
      </div>
    </div>
  );
}
