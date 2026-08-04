import { describe, expect, it } from "vitest";
import { isMissingSchemaError } from "~/lib/dbErrors";

/** Shaped like what `postgres` throws — a plain Error with a SQLSTATE `code`. */
function postgresError(message: string, code: string): Error {
  return Object.assign(new Error(message), { code, severity: "ERROR" });
}

describe("isMissingSchemaError", () => {
  it("recognises a missing table", () => {
    // The failure behind "Genskab hele ugen" erroring in production: the
    // deploy shipped `offer_snapshots` before the migration had been run.
    expect(
      isMissingSchemaError(postgresError('relation "offer_snapshots" does not exist', "42P01")),
    ).toBe(true);
  });

  it("recognises a missing column", () => {
    expect(
      isMissingSchemaError(postgresError('column "recipe_snapshot" does not exist', "42703")),
    ).toBe(true);
  });

  it("leaves other database errors alone", () => {
    // A unique-violation is a real bug or a race — it must keep 500ing rather
    // than being explained away as a pending migration.
    expect(isMissingSchemaError(postgresError("duplicate key value", "23505"))).toBe(false);
    expect(isMissingSchemaError(postgresError("password authentication failed", "28P01"))).toBe(
      false,
    );
  });

  it("is safe on anything that isn't a postgres error", () => {
    expect(isMissingSchemaError(new Error("boom"))).toBe(false);
    expect(isMissingSchemaError(undefined)).toBe(false);
    expect(isMissingSchemaError(null)).toBe(false);
    expect(isMissingSchemaError("42P01")).toBe(false);
    expect(isMissingSchemaError({ code: 42703 })).toBe(false);
  });
});
