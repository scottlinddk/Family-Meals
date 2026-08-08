import { useState } from "react";
import { useImportOffers, useOffers, useRefreshOffers } from "~/ui/hooks/useOffers";
import { useFamilyStoreSettings } from "~/ui/hooks/useFamilyStoreSettings";
import { hasStoreMembership } from "~/domain/familyStoreSettings";
import { STORE_NAMES } from "~/domain/stores";
import type { StoreId } from "~/domain/types";
import { StoreOffersCard } from "~/ui/components/StoreOffersCard";
import { Button } from "~/ui/components/ui/Button";
import { Card } from "~/ui/components/ui/Card";
import { Select, Textarea } from "~/ui/components/ui/Input";
import { Accordion } from "~/ui/components/ui/Accordion";
import { t } from "~/i18n/t";

const PLACEHOLDER = `[
  {
    "storeId": "rema1000",
    "memberOnly": false,
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

/**
 * Whole offers page: one shared "fetch now" button that refreshes every
 * selected store at once, a card per selected store showing its current and
 * upcoming offers, and a manual JSON-paste escape hatch scoped to one store
 * per submission.
 */
export function OfferJsonPasteForm() {
  const [raw, setRaw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const storeSettings = useFamilyStoreSettings();
  const selectedStores = storeSettings.data?.selectedStores ?? [];
  const [pasteStoreId, setPasteStoreId] = useState<StoreId>(selectedStores[0] ?? "rema1000");
  const importOffers = useImportOffers();
  const refreshOffers = useRefreshOffers();
  const offers = useOffers();

  async function handleImport() {
    setError(null);
    try {
      const parsed = JSON.parse(raw);
      const withStore = Array.isArray(parsed)
        ? parsed.map((offer) => ({ ...offer, storeId: offer.storeId ?? pasteStoreId }))
        : parsed;
      await importOffers.mutateAsync(withStore);
      setRaw("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid JSON");
    }
  }

  return (
    <>
      <Card as="section" className="mb-4">
        <h2 className="text-lg">{t("offers.autoFetchHeading")}</h2>
        <p className="-mt-1 text-sm text-muted">{t("offers.autoFetchDescription")}</p>
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
        {refreshOffers.isSuccess && refreshOffers.data.failed.length > 0 && (
          <p className="text-sm text-red-700">
            {t("offers.fetchPartialError", {
              stores: refreshOffers.data.failed
                .map((f) => refreshOffers.data.storeNames[f.storeId] ?? f.storeId)
                .join(", "),
            })}
          </p>
        )}
      </Card>

      {offers.isLoading && <p className="mt-3 text-sm text-muted">{t("week.loading")}</p>}
      {offers.isError && <p className="mt-3 text-sm text-red-700">{t("offers.loadFailed")}</p>}

      {selectedStores.length === 0 && (
        <p className="text-sm text-muted">{t("offers.noStoresSelected")}</p>
      )}

      <div className="flex flex-col gap-4">
        {selectedStores.map((storeId) => (
          <StoreOffersCard
            key={storeId}
            storeId={storeId}
            data={offers.data?.stores[storeId]}
            hasMembership={hasStoreMembership(
              storeSettings.data ?? { selectedStores: [], memberStores: [] },
              storeId,
            )}
          />
        ))}
      </div>

      <div className="mt-4">
        <Accordion title={t("offers.formHeading")} defaultOpen={false}>
          <p className="-mt-1 text-sm text-muted">{t("offers.formDescription")}</p>
          <Select
            value={pasteStoreId}
            onChange={(e) => setPasteStoreId(e.target.value as StoreId)}
            className="mb-2"
          >
            {selectedStores.map((storeId) => (
              <option key={storeId} value={storeId}>
                {STORE_NAMES[storeId]}
              </option>
            ))}
          </Select>
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
        </Accordion>
      </div>
    </>
  );
}
