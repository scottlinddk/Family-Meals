import { describe, expect, it } from "vitest";
import {
  applyPendingMarks,
  parseItemStatus,
  shoppingListProgress,
  type ShoppingListMark,
} from "~/domain/planning/shoppingListMarks";

const marksOf = (...entries: [string, ShoppingListMark["status"]][]): ShoppingListMark[] =>
  entries.map(([label, status]) => ({ label, status }));

/**
 * The one piece of the shared marks that has to be right on a bad connection:
 * how a queued mark and the server's answer combine on screen.
 */
describe("applyPendingMarks", () => {
  it("shows the server's marks when nothing is queued", () => {
    const marks = applyPendingMarks(marksOf(["2 løg", "checked"], ["salt", "at_home"]), {});
    expect(marks.get("2 løg")).toBe("checked");
    expect(marks.get("salt")).toBe("at_home");
  });

  it("shows a queued mark the server hasn't heard about yet", () => {
    expect(applyPendingMarks([], { "2 løg": "at_home" }).get("2 løg")).toBe("at_home");
  });

  it("keeps a queued unmark cleared even while the server still has it", () => {
    // The poll that brings back the other shopper's marks must not undo the
    // line this person just cleared.
    expect(applyPendingMarks(marksOf(["2 løg", "checked"]), { "2 løg": null }).has("2 løg")).toBe(
      false,
    );
  });

  it("lets a queued mark replace a different one the server still reports", () => {
    // Someone at home said "we've got flour"; the shopper had already ticked
    // it. Whichever tap came last is the one on screen.
    expect(applyPendingMarks(marksOf(["1 kg mel", "checked"]), { "1 kg mel": "at_home" }).get("1 kg mel")).toBe(
      "at_home",
    );
  });

  it("keeps the other shopper's marks alongside the local queue", () => {
    const marks = applyPendingMarks(marksOf(["1 bakke cherrytomater", "checked"]), {
      "2 løg": "at_home",
    });
    expect([...marks.keys()].sort()).toEqual(["1 bakke cherrytomater", "2 løg"]);
  });
});

describe("shoppingListProgress", () => {
  const labels = ["2 løg", "1 kg mel", "400 g pasta", "salt"];

  it("counts everything as still to buy when nothing is marked", () => {
    expect(shoppingListProgress(labels, new Map())).toEqual({
      remaining: 4,
      inTrolley: 0,
      atHome: 0,
    });
  });

  it("takes both what's in the trolley and what's already at home off the count", () => {
    const marks = new Map(applyPendingMarks([], { "2 løg": "checked", salt: "at_home" }));
    expect(shoppingListProgress(labels, marks)).toEqual({ remaining: 2, inTrolley: 1, atHome: 1 });
  });

  it("ignores marks for lines the list no longer shows", () => {
    // A regenerated week leaves marks behind; they must not make the list
    // claim fewer things are left to buy than it is showing.
    const marks = new Map(applyPendingMarks([], { "en ret der ikke er der mere": "checked" }));
    expect(shoppingListProgress(labels, marks).remaining).toBe(4);
  });
});

describe("parseItemStatus", () => {
  it("accepts the two statuses and an explicit null", () => {
    expect(parseItemStatus("checked")).toBe("checked");
    expect(parseItemStatus("at_home")).toBe("at_home");
    // Null is a real instruction — "unmark this line" — not a missing value.
    expect(parseItemStatus(null)).toBeNull();
  });

  it("rejects anything else, so a bad request can be answered as one", () => {
    for (const value of [undefined, "", "CHECKED", "bought", true, 1, {}]) {
      expect(parseItemStatus(value)).toBeUndefined();
    }
  });
});
