import { createAuthClient } from "better-auth/react";
import { clientEnv } from "./env";

export const authClient = createAuthClient({
  baseURL: clientEnv.apiBaseUrl,
  // Cross-origin session cookies need credentials: include on every auth
  // request. Matches what the tRPC client already does.
  fetchOptions: {
    credentials: "include",
  },
});

export const { useSession, signIn, signOut, signUp } = authClient;
