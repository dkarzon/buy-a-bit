import { Outlet } from "react-router-dom";

/**
 * Wrap merchant routes once Better Auth is wired (Day 1).
 * Uses authClient.useSession() → redirect to /login when null.
 *
 * Phase 0: passthrough so the router skeleton is browsable.
 */
export function ProtectedRoute({ children }: { children?: React.ReactNode }) {
  // Day 1:
  // const { data: session, isPending } = authClient.useSession();
  // if (isPending) return <Spinner />;
  // if (!session) return <Navigate to="/login" replace />;

  return children ? <>{children}</> : <Outlet />;
}
