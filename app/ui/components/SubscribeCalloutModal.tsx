import { useState } from "react";
import { useIcsUrl } from "~/ui/hooks/useIcsUrl";
import { Button } from "~/ui/components/ui/Button";
import { t } from "~/i18n/t";

export function SubscribeCalloutModal() {
  const [open, setOpen] = useState(false);
  const { webcalUrl, httpsUrl } = useIcsUrl();

  return (
    <div>
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
        {t("calendar.subscribeButton")}
      </Button>

      {open && (
        <div className="fixed inset-0 grid place-items-center bg-neutral-900/50 p-4">
          <div className="flex w-full max-w-md flex-col gap-3 rounded-lg border border-divider bg-surface p-4 shadow-lg">
            <h2 className="text-xl">{t("calendar.modalHeading")}</h2>
            <p className="text-sm opacity-85">{t("calendar.modalDescription")}</p>

            <div className="rounded-md border border-divider bg-bg p-2 font-mono text-xs break-all">
              {webcalUrl}
            </div>

            <ul className="m-0 list-disc pl-4.5 text-sm">
              <li>{t("calendar.apple")}</li>
              <li>{t("calendar.google")}</li>
              <li>{t("calendar.outlook")}</li>
            </ul>

            {httpsUrl && (
              <div className="rounded-md border border-divider bg-bg p-2 font-mono text-xs break-all">
                {httpsUrl}
              </div>
            )}

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
