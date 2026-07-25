import { Navigate } from "react-router-dom";

import { authClient } from "../lib/auth-client";
import { trpc } from "../lib/trpc";

export function HomePage() {
  const { data: session, isPending } = authClient.useSession();
  const merchantQuery = trpc.merchant.me.useQuery(undefined, {
    enabled: Boolean(session),
    retry: false,
  });

  if (isPending || (session && merchantQuery.isPending)) {
    return <main className="grid min-h-screen place-items-center text-sm text-muted">Loading…</main>;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // Merchants land on their dashboard; everyone else is a customer account
  return <Navigate to={merchantQuery.data?.merchant ? "/dashboard" : "/account"} replace />;
}
