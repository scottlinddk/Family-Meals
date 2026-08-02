import { useState } from "react";
import { useIcsUrl } from "~/ui/hooks/useIcsUrl";
import { t } from "~/i18n/t";

export function SubscribeCalloutModal() {
  const [open, setOpen] = useState(false);
  const { webcalUrl, httpsUrl } = useIcsUrl();

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded bg-gray-900 px-3 py-1.5 text-sm text-white"
      >
        {t("calendar.subscribeButton")}
      </button>

      {open && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-5">
            <h2 className="text-lg font-semibold">{t("calendar.modalHeading")}</h2>
            <p className="mt-2 text-sm text-gray-600">{t("calendar.modalDescription")}</p>

            <div className="mt-3 rounded bg-gray-50 p-2 text-xs break-all">{webcalUrl}</div>

            <ul className="mt-3 list-disc space-y-1 pl-4 text-sm text-gray-700">
              <li>{t("calendar.apple")}</li>
              <li>{t("calendar.google")}</li>
              <li>{t("calendar.outlook")}</li>
            </ul>

            {httpsUrl && (
              <div className="mt-2 rounded bg-gray-50 p-2 text-xs break-all">{httpsUrl}</div>
            )}

            <p className="mt-3 text-xs text-gray-500">{t("calendar.refreshNote")}</p>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-4 rounded border border-gray-300 px-3 py-1.5 text-sm"
            >
              {t("calendar.close")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
