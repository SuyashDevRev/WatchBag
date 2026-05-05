import { sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { publicProcedure, router } from "../trpc/trpc.js";

export const healthRouter = router({
  ping: publicProcedure.query(() => ({
    status: "ok" as const,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  })),

  db: publicProcedure.query(async () => {
    const start = Date.now();
    const result = await db.execute<{ now: Date }>(sql`SELECT NOW() as now`);
    const row = result.rows[0];
    return {
      ok: true,
      now: row?.now ?? null,
      latencyMs: Date.now() - start,
    };
  }),
});
