import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { db } from "../db/index.js";
import * as schema from "../db/schema.js";
import { env } from "../env.js";

if (!env.BETTER_AUTH_SECRET) {
  throw new Error(
    "BETTER_AUTH_SECRET is required. Generate one with: openssl rand -base64 48",
  );
}

// Google is optional — we only register the provider if both halves of the
// credential pair are present.
const socialProviders =
  env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
    ? {
        google: {
          clientId: env.GOOGLE_CLIENT_ID,
          clientSecret: env.GOOGLE_CLIENT_SECRET,
        },
      }
    : undefined;

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,

  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),

  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 8,
  },

  ...(socialProviders ? { socialProviders } : {}),

  trustedOrigins: env.CORS_ORIGIN,

  advanced: {
    cookiePrefix: "watchbag",
    useSecureCookies: env.NODE_ENV === "production",
    // In production the web (vercel.app) and API (fly.dev) live on different
    // sites, so the session cookie needs SameSite=None to be sent on cross-site
    // fetch calls. Requires Secure, which useSecureCookies=true gives us.
    // In development both run on localhost — Lax is fine and safer.
    defaultCookieAttributes:
      env.NODE_ENV === "production"
        ? { sameSite: "none", secure: true }
        : { sameSite: "lax" },
  },
});

export type Session = typeof auth.$Infer.Session;
