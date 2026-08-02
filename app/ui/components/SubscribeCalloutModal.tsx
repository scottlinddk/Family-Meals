import { useState } from "react";
import { useIcsUrl } from "~/ui/hooks/useIcsUrl";
import { Button } from "~/ui/components/ui/Button";
import { Card } from "~/ui/components/ui/Card";
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
        <div className="fixed inset-0 flex items-center justify-center bg-ink/40 p-4">
          <Card className="w-full max-w-md bg-surface p-6">
            <h2 className="font-display text-2xl">{t("calendar.modalHeading")}</h2>
            <p className="mt-2 text-sm text-ink-2">{t("calendar.modalDescription")}</p>

            <div className="mt-3 rounded-md border border-line bg-surface-2 p-2 font-mono text-xs break-all">
              {webcalUrl}
            </div>

            <ul className="mt-3 list-disc space-y-1 pl-4 text-sm text-ink-2">
              <li>{t("calendar.apple")}</li>
              <li>{t("calendar.google")}</li>
              <li>{t("calendar.outlook")}</li>
            </ul>

            {httpsUrl && (
              <div className="mt-2 rounded-md border border-line bg-surface-2 p-2 font-mono text-xs break-all">
                {httpsUrl}
              </div>
            )}

            <p className="mt-3 font-mono text-xs text-muted">{t("calendar.refreshNote")}</p>

            <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => setOpen(false)}>
              {t("calendar.close")}
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
}
