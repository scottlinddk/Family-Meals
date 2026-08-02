import { describe, expect, it } from "vitest";
import { t } from "~/i18n/t";

describe("t", () => {
  it("defaults to Danish", () => {
    expect(t("week.generate")).toBe("Generér ugeplan");
  });

  it("substitutes {{vars}} placeholders", () => {
    expect(t("week.heading", { date: "2026-08-03" })).toBe("Uge fra 2026-08-03");
  });

  it("supports explicit English", () => {
    expect(t("week.generate", undefined, "en")).toBe("Generate week plan");
  });
});
