import { useState } from "react";
import { useImportOffers, useOffers, useRefreshOffers } from "~/ui/hooks/useOffers";
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
    <section className="rounded-lg border border-gray-200 p-4">
      <h2 className="text-lg font-semibold">{t("offers.autoFetchHeading")}</h2>
      <p className="mt-1 text-sm text-gray-600">{t("offers.autoFetchDescription")}</p>
      <button
        type="button"
        onClick={() => refreshOffers.mutate()}
        disabled={refreshOffers.isPending}
        className="mt-2 rounded bg-gray-900 px-3 py-1.5 text-sm text-white disabled:opacity-50"
      >
        {refreshOffers.isPending ? t("offers.fetching") : t("offers.fetchNow")}
      </button>
      {refreshOffers.isError && (
        <p className="mt-1 text-sm text-red-700">
          {t("offers.fetchError")} {refreshOffers.error instanceof Error ? refreshOffers.error.message : ""}
        </p>
      )}

      <h2 className="mt-6 text-lg font-semibold">{t("offers.formHeading")}</h2>
      <p className="mt-1 text-sm text-gray-600">{t("offers.formDescription")}</p>
      <textarea
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        placeholder={PLACEHOLDER}
        rows={10}
        className="mt-3 w-full rounded border border-gray-300 p-2 font-mono text-xs"
      />
      {error && <p className="mt-1 text-sm text-red-700">{error}</p>}
      <button
        type="button"
        onClick={handleImport}
        disabled={importOffers.isPending || raw.trim().length === 0}
        className="mt-2 rounded bg-gray-900 px-3 py-1.5 text-sm text-white disabled:opacity-50"
      >
        {importOffers.isPending ? t("offers.importing") : t("offers.import")}
      </button>

      <div className="mt-4">
        <h3 className="text-sm font-medium text-gray-700">
          {t("offers.currentlyImported", { count: offers.data?.length ?? 0 })}
        </h3>
        <ul className="mt-1 max-h-48 space-y-1 overflow-y-auto text-sm text-gray-600">
          {offers.data?.map((offer, i) => (
            <li key={i}>
              {offer.name} — {offer.price} {offer.currencyCode}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
