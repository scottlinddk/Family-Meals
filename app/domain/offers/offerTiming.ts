import { FAMILY_TIMEZONE } from "~/lib/time";
import type { Offer, StoreId } from "~/domain/types";

/**
 * Each chain's weekly catalog runs a full week, but some offers inside it are
 * only valid for the back end of that week — "Naturli' Drik eller kokosvand"
 * running Thursday–Saturday rather than the full week, say. A shopper reading
 * "on offer" without that caveat plans a Tuesday dinner around something
 * that isn't discounted yet.
 *
 * There's no explicit flag for this in the source data — it has to be read
 * off the offer's own validity window: materially shorter than a full week,
 * and ending on the week's last few days rather than running from its start.
 * Which weekday a "full week" starts on differs per chain, so it's looked up
 * per `storeId` below.
 */
const WEEKEND_OFFER_MAX_DAYS = 4;
const WEEKEND_END_WEEKDAYS = new Set(["Friday", "Saturday", "Sunday"]);

/**
 * The weekday each chain's catalog week starts on. Only `rema1000`'s
 * Sunday–Saturday cadence has been confirmed against real catalog data — the
 * others default to Monday as the more common Danish retail cadence, but
 * that's an assumption, not something verified against a live Netto/Føtex/
 * Meny catalog. Confirm against real `run_from`/`run_till` dates before
 * trusting the weekend-only badge for those stores.
 */
const STORE_CATALOG_WEEK_START: Record<StoreId, string> = {
  rema1000: "Sunday",
  netto: "Monday", // unverified
  foetex: "Monday", // unverified
  meny: "Monday", // unverified
};

function weekdayInFamilyTimezone(date: Date): string {
  return date.toLocaleDateString("en-US", { timeZone: FAMILY_TIMEZONE, weekday: "long" });
}

/**
 * True when `offer` runs for only the tail of its store's catalog week
 * rather than the whole thing — short enough, and starting late enough in
 * the week, that calling it simply "on offer this week" would overstate
 * when it's actually discounted.
 */
export function isWeekendOnlyOffer(offer: Pick<Offer, "validFrom" | "validUntil" | "storeId">): boolean {
  const from = new Date(offer.validFrom);
  const until = new Date(offer.validUntil);
  const durationDays = (until.getTime() - from.getTime()) / 86_400_000;
  if (durationDays > WEEKEND_OFFER_MAX_DAYS) return false;

  const fullWeekStartWeekday = STORE_CATALOG_WEEK_START[offer.storeId];
  return (
    weekdayInFamilyTimezone(from) !== fullWeekStartWeekday && WEEKEND_END_WEEKDAYS.has(weekdayInFamilyTimezone(until))
  );
}
