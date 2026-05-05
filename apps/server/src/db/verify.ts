// One-shot script — lists tables + enums in the connected Postgres.
// Run: pnpm --filter @watchbag/server exec tsx src/db/verify.ts
import { neonConfig, Pool } from "@neondatabase/serverless";
import ws from "ws";
import { env } from "../env.js";

async function main() {
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL required");
  neonConfig.webSocketConstructor = ws;
  const pool = new Pool({ connectionString: env.DATABASE_URL });

  const { rows: tables } = await pool.query<{ table_name: string }>(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' ORDER BY table_name`,
  );
  const { rows: enums } = await pool.query<{ enum_name: string; values: string }>(
    `SELECT t.typname AS enum_name, string_agg(e.enumlabel, ',') AS values
     FROM pg_type t
     JOIN pg_enum e ON t.oid = e.enumtypid
     GROUP BY t.typname`,
  );

  console.log("Tables:", tables.map((r) => r.table_name).join(", "));
  console.log("Enums: ", enums.map((r) => `${r.enum_name}(${r.values})`).join(", "));

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
