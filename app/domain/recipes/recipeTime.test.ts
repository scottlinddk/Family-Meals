import { describe, expect, it } from "vitest";
import { fitsTimeBudget, totalPrepCookMinutes } from "~/domain/recipes/recipeTime";

describe("totalPrepCookMinutes", () => {
  it("sums prep and cook time when either is present", () => {
    expect(totalPrepCookMinutes({ prepTimeMinutes: 15, cookTimeMinutes: 30, totalTimeMinutes: 999 })).toBe(45);
    expect(totalPrepCookMinutes({ prepTimeMinutes: 15, cookTimeMinutes: undefined, totalTimeMinutes: 999 })).toBe(15);
  });

  it("falls back to totalTimeMinutes when neither prep nor cook is known", () => {
    expect(totalPrepCookMinutes({ totalTimeMinutes: 40 })).toBe(40);
  });

  it("is undefined when no timing at all is known", () => {
    expect(totalPrepCookMinutes({})).toBeUndefined();
  });
});

describe("fitsTimeBudget", () => {
  it("always fits when there's no budget", () => {
    expect(fitsTimeBudget({}, undefined)).toBe(true);
  });

  it("fits when the recipe's time is at or under the budget", () => {
    expect(fitsTimeBudget({ totalTimeMinutes: 30 }, 30)).toBe(true);
    expect(fitsTimeBudget({ totalTimeMinutes: 29 }, 30)).toBe(true);
  });

  it("doesn't fit when the recipe's time is over the budget", () => {
    expect(fitsTimeBudget({ totalTimeMinutes: 31 }, 30)).toBe(false);
  });

  it("doesn't fit a stated budget when the recipe has no timing at all", () => {
    expect(fitsTimeBudget({}, 30)).toBe(false);
  });
});
