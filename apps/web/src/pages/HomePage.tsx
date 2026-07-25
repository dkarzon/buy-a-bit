import { Navigate } from "react-router-dom";

import { authClient } from "../lib/auth-client";

export function HomePage() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return <main className="grid min-h-screen place-items-center text-sm text-muted">Loading…</main>;
  }

  return <Navigate to={session ? "/dashboard" : "/login"} replace />;
}
