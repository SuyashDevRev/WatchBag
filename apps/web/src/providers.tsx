import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { Toaster } from "sonner";

import { clientEnv } from "./lib/env";
import { trpc } from "./lib/trpc";
import { ThemeProvider } from "./theme";

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: `${clientEnv.apiBaseUrl}/trpc`,
          fetch(url, options) {
            // Send the session cookie along with tRPC requests.
            return fetch(url, { ...options, credentials: "include" });
          },
        }),
      ],
    }),
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>{children}</ThemeProvider>
        <Toaster theme="dark" richColors position="top-center" />
      </QueryClientProvider>
    </trpc.Provider>
  );
}
