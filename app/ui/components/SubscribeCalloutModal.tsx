import { useEffect, useState } from "react";
import { useIcsUrl } from "~/ui/hooks/useIcsUrl";
import { Button, IconButton } from "~/ui/components/ui/Button";
import { BottomSheet } from "~/ui/components/ui/BottomSheet";
import { CalendarIcon } from "~/ui/components/Icon";
import { t } from "~/i18n/t";

/**
 * "Subscribe in your calendar app" — opened from the calendar icon in the
 * header band, where it sits as one round control rather than a labelled
 * button, because the band belongs to the app and not to any page.
 */
export function SubscribeCalloutModal() {
  const [open, setOpen] = useState(false);
  const { webcalUrl, httpsUrl } = useIcsUrl();

  return (
    <>
      <IconButton
        type="button"
        aria-label={t("calendar.subscribeButton")}
        title={t("calendar.subscribeButton")}
        onClick={() => setOpen(true)}
      >
        <CalendarIcon />
      </IconButton>

      <BottomSheet open={open} onClose={() => setOpen(false)} labelledBy="subscribe-modal-heading">
        <h2 id="subscribe-modal-heading" className="text-lg font-bold">
          {t("calendar.modalHeading")}
        </h2>
        <p className="m-0 text-[13px] text-muted">{t("calendar.modalDescription")}</p>

        <CopyableUrl url={webcalUrl} />

        <ul className="m-0 list-disc pl-4.5 text-[13px]">
          <li>{t("calendar.apple")}</li>
          <li>{t("calendar.google")}</li>
          <li>{t("calendar.outlook")}</li>
        </ul>

        <CopyableUrl url={httpsUrl} />

        <p className="m-0 text-xs text-muted">{t("calendar.refreshNote")}</p>

        <Button type="button" variant="secondary" block onClick={() => setOpen(false)}>
          {t("calendar.close")}
        </Button>
      </BottomSheet>
    </>
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
      <div className="min-w-0 flex-1 rounded-sm border border-divider bg-neutral-100 p-2.5 font-mono text-xs break-all">
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
