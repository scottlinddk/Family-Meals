/**
 * Applies pending Drizzle migrations as part of a Vercel *production* build.
 *
 * Deploys are automatic; `npm run db:migrate` was not. Every release that
 * added a table or column therefore went live against a database that didn't
 * have it yet, and the app 500ed until someone remembered to migrate by hand
 * — four times in three days (`recipe_snapshot`, `external_recipes`,
 * `description`, `offer_snapshots`). Tying the migration to the deploy that
 * needs it is the only way the two stay in step.
 *
 * Production only, deliberately: preview deployments share the same
 * `DATABASE_URL`, so migrating from a feature branch would apply unreviewed
 * schema changes to the live database. Local builds are skipped too — running
 * migrations as a side effect of `npm run build` would be a nasty surprise.
 *
 * Two things this needs from the Vercel project, both one-time setup:
 *   * `DATABASE_URL` exposed to the Build step, not just to Functions.
 *   * a direct Postgres connection string (port 5432), not the transaction
 *     pooler (6543) — pooled connections can't run migration DDL reliably.
 */
import { spawnSync } from "node:child_process";

const target = process.env.VERCEL_ENV;

if (target !== "production") {
  console.log(
    `[migrate] Skipped: VERCEL_ENV is ${target ?? "unset"}. Migrations run on production deploys only.`,
  );
  process.exit(0);
}

if (!process.env.DATABASE_URL) {
  console.error(
    "[migrate] DATABASE_URL is not set for this build, so the schema can't be brought up to " +
      "date.\n" +
      "[migrate] Failing here rather than shipping code the database can't serve — that is the " +
      "exact failure this step exists to prevent.\n" +
      "[migrate] Fix: in the Vercel project's Environment Variables, make DATABASE_URL available " +
      "to the Build step (a direct connection string on port 5432, not the pooler on 6543).",
  );
  process.exit(1);
}

console.log("[migrate] Applying pending migrations to the production database…");
const result = spawnSync("npm", ["run", "db:migrate"], { stdio: "inherit" });

if (result.status !== 0) {
  console.error("[migrate] Migration failed — stopping the deploy so the broken schema never goes live.");
}

process.exit(result.status ?? 1);
