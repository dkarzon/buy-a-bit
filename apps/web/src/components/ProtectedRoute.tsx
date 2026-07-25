import type { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

import { authClient } from "../lib/auth-client";
import { trpc } from "../lib/trpc";

export function ProtectedRoute({ children }: { children?: ReactNode }) {
  const location = useLocation();
  const { data: session, isPending } = authClient.useSession();
  const merchantQuery = trpc.merchant.me.useQuery(undefined, {
    enabled: Boolean(session),
    retry: false,
  });

  if (isPending || (session && merchantQuery.isPending)) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-muted">
        Loading your account…
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (merchantQuery.isError) {
    return (
      <div className="grid min-h-screen place-items-center px-6 text-center">
        <div className="grid max-w-sm gap-3">
          <h1 className="text-xl font-semibold">Could not load your account</h1>
          <p className="text-sm text-muted">{merchantQuery.error.message}</p>
          <button className="button button-primary" onClick={() => void merchantQuery.refetch()}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  const hasMerchant = Boolean(merchantQuery.data?.merchant);
  if (!hasMerchant && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }
  if (hasMerchant && location.pathname === "/onboarding") {
    return <Navigate to="/dashboard" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}
