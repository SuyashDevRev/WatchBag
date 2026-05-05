import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { auth } from "../auth/index.js";

export async function createContext({ req, res }: CreateExpressContextOptions) {
  // Better Auth parses its own cookies; we hand it a Headers instance.
  const session = await auth.api.getSession({
    headers: new Headers(req.headers as Record<string, string>),
  });

  return {
    req,
    res,
    session: session?.session ?? null,
    user: session?.user ?? null,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
