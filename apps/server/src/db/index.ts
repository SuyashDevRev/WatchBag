import { neonConfig, Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";

import { env } from "../env.js";
import * as schema from "./schema.js";

if (!env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. Add it to apps/server/.env before starting the server.",
  );
}

// Neon's serverless driver uses WebSockets in Node; point it at `ws`.
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: env.DATABASE_URL });

export const db = drizzle(pool, { schema });
export type Database = typeof db;
export { schema };
