// Vite exposes env vars prefixed with VITE_ to the client. Everything here is
// safe to include in the bundle.
//
// In production we want the API to live at the same origin as the web app
// (so session cookies are first-party) — Vercel's rewrites forward /api/* and
// /trpc/* to the Fly server. In dev the API is on a different localhost port
// so we still need the full URL.
const raw = import.meta.env.VITE_API_BASE_URL;
const normalized = raw && raw.trim().length > 0 ? raw : null;

export const clientEnv = {
  // Empty string = same origin, so fetch("/trpc/...") resolves to
  // "https://watchbag.vercel.app/trpc/..." without a cross-origin hop.
  apiBaseUrl: normalized ?? (import.meta.env.DEV ? "http://localhost:3000" : ""),
};
