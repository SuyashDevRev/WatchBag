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

// Where to send the browser when something goes wrong during OAuth
// (state_mismatch, provider error, etc.). We route to the web app's /login
// page so users land somewhere they can act, not on a bare API 404.
const oauthErrorURL = (() => {
  const first = env.CORS_ORIGIN[0];
  if (!first) return undefined;
  return `${first.replace(/\/$/, "")}/login`;
})();

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

  account: {
    // OAuth state is persisted to the `verifications` table and checked on
    // callback. Skip the supplementary cookie check — in a split-origin
    // deploy (web on vercel.app, API on fly.dev) the state cookie is a
    // third-party cookie and browsers with tracking protection drop it,
    // which surfaces as `state_mismatch` on an otherwise valid flow. The
    // DB-stored state is still cryptographically random + one-shot, so
    // CSRF protection is intact.
    skipStateCookieCheck: true,
  },

  ...(oauthErrorURL ? { onAPIError: { errorURL: oauthErrorURL } } : {}),

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
