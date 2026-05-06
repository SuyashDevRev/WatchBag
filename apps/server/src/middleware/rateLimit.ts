import type { NextFunction, Request, Response } from "express";

// A minimal sliding-window rate limiter backed by an in-memory Map. Good
// enough for a single-instance v1 deploy; switch to Upstash/Redis when we
// horizontally scale.
//
// Entries are evicted lazily on access so the map doesn't grow unbounded in
// normal traffic. For a cold scale-down we also sweep every 60s.

interface Bucket {
  timestamps: number[]; // epoch ms
}

interface Rule {
  windowMs: number;
  max: number;
}

function createStore() {
  const store = new Map<string, Bucket>();
  setInterval(() => {
    const cutoff = Date.now() - 60 * 60 * 1000; // 1h
    for (const [k, v] of store) {
      if (v.timestamps.length === 0 || v.timestamps[v.timestamps.length - 1]! < cutoff) {
        store.delete(k);
      }
    }
  }, 60_000).unref();
  return store;
}

const store = createStore();

function check(key: string, rule: Rule): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const since = now - rule.windowMs;
  const bucket = store.get(key) ?? { timestamps: [] };
  const recent = bucket.timestamps.filter((t) => t > since);
  if (recent.length >= rule.max) {
    const oldest = recent[0]!;
    const retryAfterMs = oldest + rule.windowMs - now;
    store.set(key, { timestamps: recent });
    return { allowed: false, retryAfterSec: Math.max(1, Math.ceil(retryAfterMs / 1000)) };
  }
  recent.push(now);
  store.set(key, { timestamps: recent });
  return { allowed: true, retryAfterSec: 0 };
}

function clientIp(req: Request): string {
  // In production behind a proxy we'd trust X-Forwarded-For. For now we read
  // both to avoid coupling to a specific deploy shape.
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.length > 0) return fwd.split(",")[0]!.trim();
  return req.ip ?? req.socket.remoteAddress ?? "unknown";
}

export function rateLimit(rule: Rule, keyPrefix: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${keyPrefix}:${clientIp(req)}`;
    const result = check(key, rule);
    res.setHeader("X-RateLimit-Limit", String(rule.max));
    res.setHeader("X-RateLimit-Remaining", String(Math.max(0, rule.max - (rule.max - (result.allowed ? 1 : 0)))));
    if (!result.allowed) {
      res.setHeader("Retry-After", String(result.retryAfterSec));
      res.status(429).json({
        error: "Too many requests. Please try again shortly.",
        retryAfterSec: result.retryAfterSec,
      });
      return;
    }
    next();
  };
}

// Pre-baked rules used by the auth routes. 15 min window for sign-in (to
// deter brute force without punishing a user who fat-fingers their password)
// and a 1 hour window for sign-up (to deter bulk account creation).
export const signInRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 }, "signin");
export const signUpRateLimit = rateLimit({ windowMs: 60 * 60 * 1000, max: 5 }, "signup");
