import { describe, expect, it } from "vitest";
import {
  parseShareTarget,
  shareTargetKey,
  shareTargetToQuery,
  weekStartDateOf,
} from "~/domain/sharing/shareTarget";

describe("parseShareTarget", () => {
  it("reads each kind out of its own parameters", () => {
    expect(parseShareTarget({ kind: "week", weekStartDate: "2025-01-06" })).toEqual({
      kind: "week",
      weekStartDate: "2025-01-06",
    });
    expect(parseShareTarget({ kind: "day", date: "2025-01-08" })).toEqual({
      kind: "day",
      date: "2025-01-08",
    });
    expect(parseShareTarget({ kind: "recipe", recipeId: "boller-i-karry" })).toEqual({
      kind: "recipe",
      recipeId: "boller-i-karry",
    });
  });

  it("rejects a target whose own parameter is missing", () => {
    expect(parseShareTarget({ kind: "week", date: "2025-01-06" })).toBeUndefined();
    expect(parseShareTarget({ kind: "day", weekStartDate: "2025-01-06" })).toBeUndefined();
    expect(parseShareTarget({ kind: "recipe" })).toBeUndefined();
  });

  it("rejects unknown kinds and dates that aren't dates", () => {
    expect(parseShareTarget({ kind: "shopping-list", weekStartDate: "2025-01-06" })).toBeUndefined();
    expect(parseShareTarget({ kind: undefined })).toBeUndefined();
    expect(parseShareTarget({ kind: "week", weekStartDate: "next-week" })).toBeUndefined();
    expect(parseShareTarget({ kind: "day", date: "8-1-2025" })).toBeUndefined();
  });
});

describe("weekStartDateOf", () => {
  it("takes a week share's own week", () => {
    expect(weekStartDateOf({ kind: "week", weekStartDate: "2025-01-06" })).toBe("2025-01-06");
  });

  it("derives a day share's week from its date", () => {
    // Wednesday 8 January 2025 belongs to the week starting Monday the 6th.
    expect(weekStartDateOf({ kind: "day", date: "2025-01-08" })).toBe("2025-01-06");
    // Sunday closes the week it started, rather than opening the next one.
    expect(weekStartDateOf({ kind: "day", date: "2025-01-12" })).toBe("2025-01-06");
  });

  it("gives a recipe no week, because it belongs to none", () => {
    expect(weekStartDateOf({ kind: "recipe", recipeId: "boller-i-karry" })).toBeNull();
  });
});

describe("shareTargetToQuery / shareTargetKey", () => {
  it("round-trips through the query parameters it produces", () => {
    for (const target of [
      { kind: "week", weekStartDate: "2025-01-06" },
      { kind: "day", date: "2025-01-08" },
      { kind: "recipe", recipeId: "boller-i-karry" },
    ] as const) {
      expect(parseShareTarget(shareTargetToQuery(target))).toEqual(target);
    }
  });

  it("keys two different things apart, and the same thing together", () => {
    expect(shareTargetKey({ kind: "day", date: "2025-01-08" })).toBe(
      shareTargetKey({ kind: "day", date: "2025-01-08" }),
    );
    expect(shareTargetKey({ kind: "week", weekStartDate: "2025-01-06" })).not.toBe(
      shareTargetKey({ kind: "day", date: "2025-01-06" }),
    );
  });
});
