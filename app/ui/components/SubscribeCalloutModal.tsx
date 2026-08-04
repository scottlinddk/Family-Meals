import { useEffect, useState } from "react";
import { useIcsUrl } from "~/ui/hooks/useIcsUrl";
import { Button } from "~/ui/components/ui/Button";
import { t } from "~/i18n/t";

/**
 * "Subscribe in your calendar app" callout, opened from the top nav (inline on
 * desktop, from inside the mobile menu panel below `sm` — hence `block`, which
 * makes the trigger fill the panel row).
 */
export function SubscribeCalloutModal({ block = false }: { block?: boolean }) {
  const [open, setOpen] = useState(false);
  const { webcalUrl, httpsUrl } = useIcsUrl();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div className={block ? "w-full" : undefined}>
      <Button type="button" variant="secondary" size="sm" block={block} onClick={() => setOpen(true)}>
        {t("calendar.subscribeButton")}
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-40 grid place-items-center overflow-y-auto bg-neutral-900/50 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="subscribe-modal-heading"
            className="flex w-full max-w-md flex-col gap-3 rounded-lg border border-divider bg-surface p-4 shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="subscribe-modal-heading" className="text-xl">
              {t("calendar.modalHeading")}
            </h2>
            <p className="text-sm opacity-85">{t("calendar.modalDescription")}</p>

            <CopyableUrl url={webcalUrl} />

            <ul className="m-0 list-disc pl-4.5 text-sm">
              <li>{t("calendar.apple")}</li>
              <li>{t("calendar.google")}</li>
              <li>{t("calendar.outlook")}</li>
            </ul>

            <CopyableUrl url={httpsUrl} />

            <p className="m-0 text-xs text-muted">{t("calendar.refreshNote")}</p>

            <div className="mt-1 flex justify-end">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                {t("calendar.close")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Feed URLs are long and unbroken, so selecting one by hand on a phone is
 * fiddly — offer a copy button alongside the text.
 */
function CopyableUrl({ url }: { url: string | undefined }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  if (!url) return null;

  return (
    <div className="flex items-start gap-2">
      <div className="min-w-0 flex-1 rounded-md border border-divider bg-bg p-2 font-mono text-xs break-all">
        {url}
      </div>
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
    </div>
  );
}
