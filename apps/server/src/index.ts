import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { pinoHttp } from "pino-http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { toNodeHandler } from "better-auth/node";

import { auth } from "./auth/index.js";
import { env } from "./env.js";
import { logger } from "./logger.js";
import { appRouter } from "./routers/index.js";
import { createContext } from "./trpc/context.js";

const app = express();

app.use(pinoHttp({ logger }));
app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  }),
);

// Better Auth exposes its own HTTP handler at /api/auth/*. It parses its own
// body, so it must be mounted BEFORE express.json().
app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(cookieParser());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

app.use(
  "/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
    onError({ error, path }) {
      logger.error({ err: error, path }, "tRPC error");
    },
  }),
);

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

const server = app.listen(env.PORT, () => {
  logger.info(`Server listening on http://localhost:${env.PORT}`);
});

const shutdown = (signal: string) => {
  logger.info(`${signal} received, shutting down`);
  server.close(() => process.exit(0));
};
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
