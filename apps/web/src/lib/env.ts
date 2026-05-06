// Vite exposes env vars prefixed with VITE_ to the client. Everything here is
// safe to include in the bundle.
export const clientEnv = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000",
};
