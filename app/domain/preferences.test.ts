import { describe, expect, it } from "vitest";
import { DEFAULT_USER_PREFERENCES, parseCookViewMode } from "~/domain/preferences";

describe("parseCookViewMode", () => {
  it("accepts the known modes", () => {
    expect(parseCookViewMode("steps")).toBe("steps");
    expect(parseCookViewMode("all")).toBe("all");
  });

  it("rejects anything else", () => {
    for (const value of ["", "STEPS", "grid", 1, null, undefined, {}]) {
      expect(parseCookViewMode(value)).toBeNull();
    }
  });

  it("defaults to stepping through", () => {
    expect(DEFAULT_USER_PREFERENCES.cookViewMode).toBe("steps");
  });
});
