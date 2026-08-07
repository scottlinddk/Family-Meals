import type { StoreOffers } from "~/ui/hooks/useOffers";
import { Card } from "~/ui/components/ui/Card";
import { Tag } from "~/ui/components/ui/Tag";
import { isWeekendOnlyOffer } from "~/domain/offers/offerTiming";
import { STORE_NAMES } from "~/domain/stores";
import type { Offer, StoreId } from "~/domain/types";
import { t } from "~/i18n/t";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("da-DK", { day: "numeric", month: "short" });
}

/**
 * Says where this store's current offers came from, when, and how much of
 * the import is still valid — an import whose offers have all expired
 * otherwise looks identical to never having imported at all.
 */
function OfferSnapshotNote({ data }: { data: StoreOffers }) {
  const { snapshot, offers, upcomingOffers, importedCount } = data;
  if (!snapshot) return null;

  const expired = importedCount - offers.length - upcomingOffers.length;

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

function OfferList({ offers, hasMembership }: { offers: Offer[]; hasMembership: boolean }) {
  return (
    <ul className="m-0 mt-1.5 flex max-h-56 list-none flex-col overflow-y-auto p-0">
      {offers.map((offer, i) => (
        <li key={i} className="flex flex-col gap-1 border-b border-divider py-2.5 text-sm last:border-b-0">
          <div className="flex items-center justify-between gap-3">
            <span className="min-w-0 flex-1">{offer.name}</span>
            <span className="shrink-0 text-[13px] font-bold text-accent-700">
              {offer.price} {offer.currencyCode}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {isWeekendOnlyOffer(offer) && (
              <Tag variant="accent-2">
                {t("offers.weekendOnly", { from: formatDate(offer.validFrom), to: formatDate(offer.validUntil) })}
              </Tag>
            )}
            {offer.memberOnly && (
              <Tag variant={hasMembership ? "accent" : "outline"}>
                {hasMembership
                  ? t("offers.memberOnly")
                  : t("offers.requiresMembership", { store: STORE_NAMES[offer.storeId] })}
              </Tag>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

/** One store's offers: snapshot info, this-week and next-week lists. */
export function StoreOffersCard({
  storeId,
  data,
  hasMembership,
}: {
  storeId: StoreId;
  data: StoreOffers | undefined;
  hasMembership: boolean;
}) {
  return (
    <Card as="section">
      <h2 className="text-lg">{STORE_NAMES[storeId]}</h2>

      {!data?.snapshot && <p className="m-0 mt-1 text-sm text-muted">{t("offers.notFetchedYet")}</p>}

      {data?.snapshot && (
        <div className="mt-1">
          <OfferSnapshotNote data={data} />

          <div className="mt-3 rounded-md border border-accent-300 bg-accent-100 p-3.5">
            <h3 className="text-sm font-bold tracking-[0.02em] text-accent-700 uppercase">
              {t("offers.thisWeek", { count: data.offers.length })}
            </h3>
            <OfferList offers={data.offers} hasMembership={hasMembership} />
          </div>

          <div className="mt-3 rounded-md border border-divider bg-neutral-100 p-3.5">
            <h3 className="text-sm font-bold tracking-[0.02em] text-neutral-700 uppercase">
              {t("offers.nextWeek", { count: data.upcomingOffers.length })}
            </h3>
            {data.upcomingOffers.length > 0 ? (
              <OfferList offers={data.upcomingOffers} hasMembership={hasMembership} />
            ) : (
              <p className="m-0 mt-1.5 text-sm text-muted">{t("offers.nextWeekEmpty")}</p>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
