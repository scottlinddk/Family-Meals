/**
 * Recognising the one database failure this app keeps hitting: code deployed
 * ahead of its migrations.
 *
 * Vercel deploys on every push, but `npm run db:migrate` is a separate manual
 * step, so a release that adds a table or column runs against a database that
 * doesn't have it yet. Postgres answers with a plain "relation ... does not
 * exist", the route 500s, and the UI showed a generic "try again" — which
 * never comes true, because retrying can't create a table.
 *
 * Classifying these SQLSTATEs lets the routes answer with a specific status
 * the UI can explain, instead of leaving the person clicking a button that
 * cannot work.
 */
const MISSING_SCHEMA_CODES = new Set([
  "42P01", // undefined_table — e.g. "relation offer_snapshots does not exist"
  "42703", // undefined_column — e.g. "column recipe_snapshot does not exist"
  "42704", // undefined_object — a type/enum a migration was meant to create
]);

/** True when the database is missing something the deployed schema expects. */
export function isMissingSchemaError(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("code" in error)) return false;
  const { code } = error as { code: unknown };
  return typeof code === "string" && MISSING_SCHEMA_CODES.has(code);
}

/**
 * 503, not 500: the request was fine and the server is fine — the database
 * just hasn't caught up with the code yet, and it will work once it has.
 */
export const SCHEMA_OUT_OF_DATE_STATUS = 503;

/** JSON body paired with `SCHEMA_OUT_OF_DATE_STATUS`. */
export const SCHEMA_OUT_OF_DATE_BODY = JSON.stringify({ error: "schema_out_of_date" });

/**
 * The client-side counterpart: what a hook throws on seeing that status, so a
 * page can say what actually went wrong. Kept next to the status it pairs
 * with, since the two only make sense together.
 */
export class SchemaOutOfDateError extends Error {
  constructor() {
    super("schema_out_of_date");
    this.name = "SchemaOutOfDateError";
  }
}
