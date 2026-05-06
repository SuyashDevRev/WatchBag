import { createAuthClient } from "better-auth/react";
import { clientEnv } from "./env";

export const authClient = createAuthClient({
  baseURL: clientEnv.apiBaseUrl,
});

export const { useSession, signIn, signOut, signUp } = authClient;
