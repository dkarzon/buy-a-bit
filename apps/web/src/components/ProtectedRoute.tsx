import { Navigate, Outlet } from "react-router-dom";

import { authClient } from "../lib/auth-client";

export function ProtectedRoute({ children }: { children?: React.ReactNode }) {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-muted">
        Checking session…
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}
