import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "~/data/db/schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Point it at your Supabase Postgres connection string (see .env.example).",
  );
}

const queryClient = postgres(connectionString, { prepare: false });

export const db = drizzle(queryClient, { schema });
