import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { useSession } from "../lib/auth-client";

export function RequireAuth({ children }: { children: ReactNode }) {
  const session = useSession();
  const location = useLocation();

  if (session.isPending) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-md items-center justify-center text-sm text-ink-300">
        Loading…
      </div>
    );
  }

  if (!session.data?.user) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }

  return <>{children}</>;
}
