import { Navigate, Outlet, useLocation } from "react-router-dom";

import { authClient } from "../lib/auth-client";

/** Guards customer account pages — needs a session, but no merchant. */
export function CustomerRoute() {
  const location = useLocation();
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-muted">
        Loading your account…
      </div>
    );
  }

  if (!session) {
    return (
      <Navigate
        to="/account/login"
        state={{ from: location.pathname + location.search }}
        replace
      />
    );
  }

  return <Outlet />;
}
