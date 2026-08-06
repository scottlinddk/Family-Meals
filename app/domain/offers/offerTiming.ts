import { FAMILY_TIMEZONE } from "~/lib/time";
import type { Offer } from "~/domain/types";

/**
 * REMA's weekly catalog runs a full week (Sunday–Saturday), but some offers
 * inside it are only valid for the back end of that week — "Naturli' Drik
 * eller kokosvand" running Thursday–Saturday rather than the full week, say.
 * A shopper reading "on offer" without that caveat plans a Tuesday dinner
 * around something that isn't discounted yet.
 *
 * There's no explicit flag for this in the source data — it has to be read
 * off the offer's own validity window: materially shorter than a full week,
 * and ending on the week's last few days rather than running from its start.
 */
const WEEKEND_OFFER_MAX_DAYS = 4;
const WEEKEND_END_WEEKDAYS = new Set(["Friday", "Saturday", "Sunday"]);
const FULL_WEEK_START_WEEKDAY = "Sunday";

function weekdayInFamilyTimezone(date: Date): string {
  return date.toLocaleDateString("en-US", { timeZone: FAMILY_TIMEZONE, weekday: "long" });
}

/**
 * True when `offer` runs for only the tail of the catalog week rather than
 * the whole thing — short enough, and starting late enough in the week, that
 * calling it simply "on offer this week" would overstate when it's actually
 * discounted.
 */
export function isWeekendOnlyOffer(offer: Pick<Offer, "validFrom" | "validUntil">): boolean {
  const from = new Date(offer.validFrom);
  const until = new Date(offer.validUntil);
  const durationDays = (until.getTime() - from.getTime()) / 86_400_000;
  if (durationDays > WEEKEND_OFFER_MAX_DAYS) return false;

  return (
    weekdayInFamilyTimezone(from) !== FULL_WEEK_START_WEEKDAY &&
    WEEKEND_END_WEEKDAYS.has(weekdayInFamilyTimezone(until))
  );
}
