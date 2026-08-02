import { useState } from "react";
import { useIcsUrl } from "~/ui/hooks/useIcsUrl";

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
        Subscribe in your calendar app
      </button>

      {open && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-5">
            <h2 className="text-lg font-semibold">Subscribe to your meal calendar</h2>
            <p className="mt-2 text-sm text-gray-600">
              This link is unique to your family — anyone with it can see (but not edit) your meal
              plan, so keep it private. You can rotate it any time if it leaks.
            </p>

            <div className="mt-3 rounded bg-gray-50 p-2 text-xs break-all">{webcalUrl}</div>

            <ul className="mt-3 list-disc space-y-1 pl-4 text-sm text-gray-700">
              <li>
                <strong>Apple Calendar:</strong> File → New Calendar Subscription, paste the link above.
              </li>
              <li>
                <strong>Google Calendar:</strong> Other calendars → From URL, paste the{" "}
                <code>https://</code> version below.
              </li>
              <li>
                <strong>Outlook:</strong> Add calendar → Subscribe from web, paste the link above.
              </li>
            </ul>

            {httpsUrl && (
              <div className="mt-2 rounded bg-gray-50 p-2 text-xs break-all">{httpsUrl}</div>
            )}

            <p className="mt-3 text-xs text-gray-500">
              Calendar apps refresh subscriptions on their own schedule (often not more than a few
              times a day) — edits here will always be correct at this link, but your calendar app
              may take a while to pick them up.
            </p>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-4 rounded border border-gray-300 px-3 py-1.5 text-sm"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
