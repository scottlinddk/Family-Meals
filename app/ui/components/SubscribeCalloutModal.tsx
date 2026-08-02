import { useState } from "react";
import { useIcsUrl } from "~/ui/hooks/useIcsUrl";
import { Button } from "~/ui/components/ui/Button";
import { Card } from "~/ui/components/ui/Card";

export function SubscribeCalloutModal() {
  const [open, setOpen] = useState(false);
  const { webcalUrl, httpsUrl } = useIcsUrl();

  return (
    <div>
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Subscribe in your calendar app
      </Button>

      {open && (
        <div className="fixed inset-0 flex items-center justify-center bg-ink/40 p-4">
          <Card className="w-full max-w-md bg-surface p-6">
            <h2 className="font-display text-2xl">Subscribe to your meal calendar</h2>
            <p className="mt-2 text-sm text-ink-2">
              This link is unique to your family — anyone with it can see (but not edit) your meal
              plan, so keep it private. You can rotate it any time if it leaks.
            </p>

            <div className="mt-3 rounded-md border border-line bg-surface-2 p-2 font-mono text-xs break-all">
              {webcalUrl}
            </div>

            <ul className="mt-3 list-disc space-y-1 pl-4 text-sm text-ink-2">
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
              <div className="mt-2 rounded-md border border-line bg-surface-2 p-2 font-mono text-xs break-all">
                {httpsUrl}
              </div>
            )}

            <p className="mt-3 font-mono text-xs text-muted">
              Calendar apps refresh subscriptions on their own schedule (often not more than a few
              times a day) — edits here will always be correct at this link, but your calendar app
              may take a while to pick them up.
            </p>

            <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => setOpen(false)}>
              Close
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
}
