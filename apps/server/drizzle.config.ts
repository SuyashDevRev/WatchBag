import "dotenv/config";
import { defineConfig } from "drizzle-kit";

// DATABASE_URL is only needed for `drizzle-kit push` / `migrate` / `studio`.
// For `generate` we diff against the schema file only, so a placeholder is fine.
const url = process.env.DATABASE_URL ?? "postgres://placeholder";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
  strict: true,
  verbose: true,
});
