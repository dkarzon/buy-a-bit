import type { ReactNode } from "react";
import { LogOut } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";

import { authClient } from "../lib/auth-client";
import { Brand } from "./ui";

/** Buyer-facing account shell — mobile-first column like checkout/settings. */
export function AccountShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();

  async function signOut() {
    await authClient.signOut();
    navigate("/account/login");
  }

  return (
    <div className="settings-page">
      <header className="settings-header">
        <Brand compact />
        <h1>My account</h1>
        <button type="button" onClick={() => void signOut()} aria-label="Sign out">
          <LogOut size={18} />
        </button>
      </header>

      <div className="settings-main">
        <p className="eyebrow">{session?.user.email}</p>
        <nav className="account-tabs" aria-label="Account sections">
          <NavLink to="/account" end className={({ isActive }) => (isActive ? "active" : "")}>
            Orders
          </NavLink>
          <NavLink
            to="/account/payment-methods"
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            Payment settings
          </NavLink>
        </nav>
        {children}
      </div>
    </div>
  );
}
