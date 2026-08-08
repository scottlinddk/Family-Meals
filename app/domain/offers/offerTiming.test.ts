import { describe, expect, it } from "vitest";
import { isWeekendOnlyOffer } from "~/domain/offers/offerTiming";

describe("isWeekendOnlyOffer", () => {
  it("flags an offer that only runs Thursday-Saturday (REMA, Sunday-start week)", () => {
    // Aug 13, 2026 00:00 CEST -> Aug 15, 2026 23:59:59 CEST (Thursday-Saturday).
    expect(
      isWeekendOnlyOffer({
        storeId: "rema1000",
        validFrom: "2026-08-12T22:00:00+0000",
        validUntil: "2026-08-15T21:59:59+0000",
      }),
    ).toBe(true);
  });

  it("does not flag a full catalog week (Sunday-Saturday) for REMA", () => {
    expect(
      isWeekendOnlyOffer({
        storeId: "rema1000",
        validFrom: "2026-08-01T22:00:00+0000",
        validUntil: "2026-08-08T21:59:59+0000",
      }),
    ).toBe(false);
  });

  it("does not flag a short offer that runs early in the week", () => {
    // Monday-Wednesday: short, but not the weekend tail-end of the week.
    expect(
      isWeekendOnlyOffer({
        storeId: "rema1000",
        validFrom: "2026-08-02T22:00:00+0000",
        validUntil: "2026-08-04T21:59:59+0000",
      }),
    ).toBe(false);
  });

  it("does not flag an offer starting at the week's beginning even if short", () => {
    // Sunday-Monday: starts at the full week's start weekday, so it reads as
    // an early-ending offer rather than a weekend-only one.
    expect(
      isWeekendOnlyOffer({
        storeId: "rema1000",
        validFrom: "2026-08-01T22:00:00+0000",
        validUntil: "2026-08-03T21:59:59+0000",
      }),
    ).toBe(false);
  });

  it("uses Netto's Monday-start week instead of REMA's Sunday-start one", () => {
    // Aug 3, 2026 is a Monday — a full Monday-Sunday week for Netto, so this
    // should NOT be flagged even though it wouldn't start on REMA's week start.
    expect(
      isWeekendOnlyOffer({
        storeId: "netto",
        validFrom: "2026-08-02T22:00:00+0000",
        validUntil: "2026-08-09T21:59:59+0000",
      }),
    ).toBe(false);

    // Thursday-Sunday inside that same Monday-start week is short and tail-end.
    expect(
      isWeekendOnlyOffer({
        storeId: "netto",
        validFrom: "2026-08-05T22:00:00+0000",
        validUntil: "2026-08-08T21:59:59+0000",
      }),
    ).toBe(true);
  });
});
