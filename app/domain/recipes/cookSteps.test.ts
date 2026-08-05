import { describe, expect, it } from "vitest";
import { buildCookSteps } from "~/domain/recipes/cookSteps";

describe("buildCookSteps", () => {
  it("numbers the method lines from one", () => {
    expect(
      buildCookSteps({
        instructionLines: ["Kog pastaen.", "Steg kødet.", "Bland det hele."],
        hasIngredients: true,
        hasVariants: false,
      }),
    ).toEqual([
      { kind: "instruction", number: 1, text: "Kog pastaen." },
      { kind: "instruction", number: 2, text: "Steg kødet." },
      { kind: "instruction", number: 3, text: "Bland det hele." },
    ]);
  });

  it("drops blank and whitespace-only method lines", () => {
    const steps = buildCookSteps({
      instructionLines: ["Kog pastaen.", "   ", "", "Servér."],
      hasIngredients: true,
      hasVariants: false,
    });
    expect(steps).toEqual([
      { kind: "instruction", number: 1, text: "Kog pastaen." },
      { kind: "instruction", number: 2, text: "Servér." },
    ]);
  });

  it("strips numbering the source already put on a step", () => {
    const steps = buildCookSteps({
      instructionLines: ["1. Skær løget.", "2) Varm panden.", "3: Steg løget."],
      hasIngredients: true,
      hasVariants: false,
    });
    expect(steps.map((step) => (step.kind === "instruction" ? step.text : step.kind))).toEqual([
      "Skær løget.",
      "Varm panden.",
      "Steg løget.",
    ]);
  });

  it("keeps a leading quantity that isn't step numbering", () => {
    const steps = buildCookSteps({
      instructionLines: ["2 spsk olie varmes op i panden."],
      hasIngredients: true,
      hasVariants: false,
    });
    expect(steps).toEqual([
      { kind: "instruction", number: 1, text: "2 spsk olie varmes op i panden." },
    ]);
  });

  it("falls back to a single ingredients step when the scrape found no method", () => {
    expect(
      buildCookSteps({ instructionLines: [], hasIngredients: true, hasVariants: false }),
    ).toEqual([{ kind: "ingredients" }]);
  });

  it("appends a serving step when the day has adult/child variants", () => {
    const steps = buildCookSteps({
      instructionLines: ["Kog pastaen."],
      hasIngredients: true,
      hasVariants: true,
    });
    expect(steps.at(-1)).toEqual({ kind: "serving" });
  });

  it("has nothing to show when there is neither a method nor ingredients", () => {
    expect(
      buildCookSteps({ instructionLines: ["  "], hasIngredients: false, hasVariants: true }),
    ).toEqual([]);
  });
});
