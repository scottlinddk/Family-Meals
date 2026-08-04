import { useState } from "react";
import { useImportOffers, useOffers, useRefreshOffers, type OffersResponse } from "~/ui/hooks/useOffers";
import { Button } from "~/ui/components/ui/Button";
import { Card } from "~/ui/components/ui/Card";
import { Textarea } from "~/ui/components/ui/Input";
import { t } from "~/i18n/t";

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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("da-DK", { day: "numeric", month: "short" });
}

/**
 * Says where the current offers came from, when, and how much of the import
 * is still valid — an import whose offers have all expired otherwise looks
 * identical to never having imported at all.
 */
function OfferSnapshotNote({ data }: { data: OffersResponse }) {
  const { snapshot, offers, importedCount } = data;
  if (!snapshot) return null;

  const expired = importedCount - offers.length;

  return (
    <p className="m-0 mt-1 text-xs text-muted">
      {t(snapshot.source === "manual" ? "offers.snapshotManual" : "offers.snapshotAuto", {
        date: formatDate(snapshot.importedAt),
      })}
      {snapshot.validFrom && snapshot.validUntil && (
        <>
          {" "}
          {t("offers.snapshotValidity", {
            from: formatDate(snapshot.validFrom),
            to: formatDate(snapshot.validUntil),
          })}
        </>
      )}
      {expired > 0 && <> {t("offers.snapshotExpired", { count: expired })}</>}
    </p>
  );
}

export function OfferJsonPasteForm() {
  const [raw, setRaw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const importOffers = useImportOffers();
  const refreshOffers = useRefreshOffers();
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
    <Card as="section" className="p-4">
      <h2 className="text-xl">{t("offers.autoFetchHeading")}</h2>
      <p className="-mt-1 text-sm opacity-80">{t("offers.autoFetchDescription")}</p>
      <Button
        type="button"
        variant="secondary"
        block
        onClick={() => refreshOffers.mutate()}
        disabled={refreshOffers.isPending}
      >
        {refreshOffers.isPending ? t("offers.fetching") : t("offers.fetchNow")}
      </Button>
      {refreshOffers.isError && (
        <p className="text-sm text-red-700">
          {t("offers.fetchError")} {refreshOffers.error instanceof Error ? refreshOffers.error.message : ""}
        </p>
      )}

      <h2 className="mt-4 text-xl">{t("offers.formHeading")}</h2>
      <p className="-mt-1 text-sm opacity-80">{t("offers.formDescription")}</p>
      <Textarea value={raw} onChange={(e) => setRaw(e.target.value)} placeholder={PLACEHOLDER} rows={10} />
      {error && <p className="text-sm text-red-700">{error}</p>}
      <Button
        type="button"
        variant="secondary"
        block
        onClick={handleImport}
        disabled={importOffers.isPending || raw.trim().length === 0}
      >
        {importOffers.isPending ? t("offers.importing") : t("offers.import")}
      </Button>

      <div className="mt-3">
        <h3 className="text-[11px] tracking-wide text-muted uppercase">
          {t("offers.currentlyImported", { count: offers.data?.offers.length ?? 0 })}
        </h3>
        {offers.data?.snapshot && <OfferSnapshotNote data={offers.data} />}
        <ul className="mt-1.5 max-h-48 space-y-1 overflow-y-auto text-sm">
          {offers.data?.offers.map((offer, i) => (
            <li key={i}>
              {offer.name} — {offer.price} {offer.currencyCode}
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
