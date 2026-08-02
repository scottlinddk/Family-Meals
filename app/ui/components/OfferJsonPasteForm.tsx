import { useState } from "react";
import { useImportOffers, useOffers } from "~/ui/hooks/useOffers";
import { Button } from "~/ui/components/ui/Button";
import { Card } from "~/ui/components/ui/Card";
import { Textarea } from "~/ui/components/ui/Input";

const PLACEHOLDER = `[
  {
    "name": "REMA 1000 Dansk kylling",
    "unitSizeFrom": 230,
    "unitSizeTo": 825,
    "unitSymbol": "g",
    "price": 25,
    "currencyCode": "DKK",
    "unitPrice": 108.7,
    "baseUnit": "kilogram",
    "departmentSlug": "meat-and-fish",
    "validFrom": "2026-08-01T22:00:00+0000",
    "validUntil": "2026-08-08T21:59:59+0000"
  }
]`;

export function OfferJsonPasteForm() {
  const [raw, setRaw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const importOffers = useImportOffers();
  const offers = useOffers();

  async function handleImport() {
    setError(null);
    try {
      const parsed = JSON.parse(raw);
      await importOffers.mutateAsync(parsed);
      setRaw("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid JSON");
    }
  }

  return (
    <Card as="section">
      <h2 className="font-display text-2xl">This week's REMA 1000 offers</h2>
      <p className="mt-1 text-sm text-ink-2">
        Paste offer JSON in the reference schema shape (same fields REMA's own listings use). This
        replaces the currently-imported offer set.
      </p>
      <Textarea
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        placeholder={PLACEHOLDER}
        rows={10}
        className="mt-3"
      />
      {error && <p className="mt-1 text-sm text-brick">{error}</p>}
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="mt-2"
        onClick={handleImport}
        disabled={importOffers.isPending || raw.trim().length === 0}
      >
        {importOffers.isPending ? "Importing..." : "Import offers"}
      </Button>

      <div className="mt-5">
        <h3 className="font-mono text-[10.5px] tracking-[0.16em] text-muted uppercase">
          Currently imported ({offers.data?.length ?? 0})
        </h3>
        <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-sm text-ink-2">
          {offers.data?.map((offer, i) => (
            <li key={i}>
              {offer.name} — {offer.price} {offer.currencyCode}
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
