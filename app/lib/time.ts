export const FAMILY_TIMEZONE = "Europe/Copenhagen";

/** Adds `days` calendar days to an ISO date (yyyy-mm-dd), no timezone conversion needed for date-only math. */
export function addDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day! + days));
  return date.toISOString().slice(0, 10);
}

/** Returns the ISO date (yyyy-mm-dd) of the Monday of the week containing `isoDate`. */
export function mondayOf(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day!));
  const weekday = date.getUTCDay(); // 0 = Sunday
  const offsetToMonday = weekday === 0 ? -6 : 1 - weekday;
  return addDays(isoDate, offsetToMonday);
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
