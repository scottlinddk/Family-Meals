/**
 * Turns a recipe into the sequence of screens shown in cook mode — the
 * focused, one-thing-at-a-time view used at the stove.
 *
 * Pure data: no React, so the sequencing rules (what counts as a step, how
 * they're numbered, what happens when the scrape found no method) are
 * testable on their own.
 */

export type CookStep =
  /** Mise en place. Only its own step when the recipe has no method at all. */
  | { kind: "ingredients" }
  | { kind: "instruction"; number: number; text: string }
  /** Serving: the adult/child variants, which apply at the plate, not the pan. */
  | { kind: "serving" };

/**
 * Some scraped methods carry their own numbering ("1. Skær løget…"), which
 * would read twice next to cook mode's step counter. Punctuation after the
 * digits is required so an instruction that genuinely opens with a quantity
 * ("2 spsk olie varmes op") keeps it.
 */
function stripLeadingStepNumber(line: string): string {
  return line.replace(/^\d{1,2}\s*[.):]\s+/, "");
}

export interface CookStepsInput {
  /** Method lines in order. Blank lines are dropped rather than shown empty. */
  instructionLines: string[];
  hasIngredients: boolean;
  /** Whether adult/child variants exist, i.e. this is a day of the plan. */
  hasVariants: boolean;
}

export function buildCookSteps({
  instructionLines,
  hasIngredients,
  hasVariants,
}: CookStepsInput): CookStep[] {
  const steps: CookStep[] = [];

  const instructions = instructionLines
    .map((line) => stripLeadingStepNumber(line.trim()))
    .filter((line) => line.length > 0);

  // With a method, ingredients stay one collapsible panel away on every step
  // instead of being a step of their own; without one, they're all there is
  // to cook from, so they become the step.
  if (instructions.length === 0) {
    if (hasIngredients) steps.push({ kind: "ingredients" });
  } else {
    instructions.forEach((text, i) => steps.push({ kind: "instruction", number: i + 1, text }));
  }

  if (hasVariants && steps.length > 0) steps.push({ kind: "serving" });

  return steps;
}
