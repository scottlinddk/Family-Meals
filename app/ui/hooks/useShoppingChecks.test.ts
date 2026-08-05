import { describe, expect, it } from "vitest";
import { applyPendingOps } from "~/ui/hooks/useShoppingChecks";

/**
 * The one piece of the shared ticks that has to be right on a bad connection:
 * how a queued tick and the server's set combine on screen.
 */
describe("applyPendingOps", () => {
  it("shows the server's set when nothing is queued", () => {
    expect([...applyPendingOps(["2 løg", "500 g hakket oksekød"], {})]).toEqual([
      "2 løg",
      "500 g hakket oksekød",
    ]);
  });

  it("shows a queued tick the server hasn't heard about yet", () => {
    expect(applyPendingOps([], { "2 løg": true }).has("2 løg")).toBe(true);
  });

  it("keeps a queued untick unticked even while the server still has it", () => {
    // The poll that brings back the other shopper's ticks must not undo the
    // box this person just cleared.
    expect(applyPendingOps(["2 løg"], { "2 løg": false }).has("2 løg")).toBe(false);
  });

  it("keeps the other shopper's ticks alongside the local queue", () => {
    const checked = applyPendingOps(["1 bakke cherrytomater"], { "2 løg": true });
    expect([...checked].sort()).toEqual(["1 bakke cherrytomater", "2 løg"]);
  });

  it("ignores a queued tick for something already ticked", () => {
    expect([...applyPendingOps(["2 løg"], { "2 løg": true })]).toEqual(["2 løg"]);
  });
});
