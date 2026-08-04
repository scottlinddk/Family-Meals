import { addDays } from "~/lib/time";

/**
 * The instant range a week plan covers, for querying offers valid during it.
 * Shared by generation and the single-day mutations so every day of a plan is
 * matched against the same offer set.
 */
export function weekWindow(weekStartDate: string): [Date, Date] {
  return [
    new Date(`${weekStartDate}T00:00:00Z`),
    new Date(`${addDays(weekStartDate, 6)}T23:59:59Z`),
  ];
}
