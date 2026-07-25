import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  BarChart3,
  Bell,
  ChevronDown,
  CircleHelp,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Package,
  Plus,
  Search,
  Settings,
  Users,
} from "lucide-react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";

import { authClient } from "../lib/auth-client";
import { initials } from "../lib/api-data";
import { trpc } from "../lib/trpc";
import { Brand } from "./ui";

const navItems = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Inventory", path: "/inventory", icon: Package },
  { label: "Sales", path: "/sales", icon: CreditCard },
  { label: "Customers", path: "/customers", icon: Users },
  { label: "Analytics", path: "/analytics", icon: BarChart3 },
];

export function MerchantShell({
  title,
  searchPlaceholder = "Search your store...",
  children,
  action,
}: {
  title: string;
  searchPlaceholder?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const merchantQuery = trpc.merchant.me.useQuery();
  const account = merchantQuery.data;
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const displayName = account?.user.name ?? account?.user.email ?? "Merchant";
  const displayEmail = account?.user.email ?? "";

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;

    function onPointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  async function signOut() {
    setSigningOut(true);
    try {
      await authClient.signOut();
      navigate("/login");
    } finally {
      setSigningOut(false);
      setMenuOpen(false);
    }
  }

  return (
    <div className="dashboard-shell">
      <aside className="sidebar">
        <Brand />
        <nav className="sidebar-nav" aria-label="Merchant navigation">
          {navItems.map(({ label, path, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              end
              className={({ isActive }) =>
                isActive ||
                (path === "/inventory" &&
                  (location.pathname.startsWith("/products") ||
                    location.pathname.startsWith("/inventory")))
                  ? "active"
                  : ""
              }
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto grid gap-2">
          <a href="mailto:support@buy-a-bit.com" className="sidebar-link"><CircleHelp size={17} /> Help</a>
          <button type="button" className="sidebar-upgrade" onClick={() => void signOut()} disabled={signingOut}>
            <LogOut size={16} /> {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </aside>

      <div className="dashboard-main">
        <header className="dashboard-header">
          <div className="flex min-w-0 items-center gap-4">
            <span className="shrink-0 text-sm font-semibold">{title}</span>
            <label className="dashboard-search">
              <Search size={15} />
              <input aria-label={`Search ${title}`} placeholder={searchPlaceholder} />
            </label>
          </div>
          <div className="flex items-center gap-2">
            {action ?? (
              <Link to="/products/new" className="button button-primary button-sm">
                <Plus size={15} /> Add product
              </Link>
            )}
            <button className="icon-button" aria-label="Notifications"><Bell size={17} /></button>
            <Link className="icon-button" aria-label="Payment settings" to="/settings/payment"><Settings size={17} /></Link>
            <div className="account-menu" ref={menuRef}>
              <button
                type="button"
                className="account-menu-trigger"
                aria-label="Account menu"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-controls={menuId}
                onClick={() => setMenuOpen((open) => !open)}
              >
                <span className="avatar">{initials(displayName)}</span>
                <ChevronDown size={14} className={menuOpen ? "account-chevron open" : "account-chevron"} />
              </button>
              {menuOpen && (
                <div className="account-dropdown" id={menuId} role="menu">
                  <div className="account-dropdown-header">
                    <strong>{displayName}</strong>
                    {displayEmail && <span>{displayEmail}</span>}
                  </div>
                  <Link
                    role="menuitem"
                    to="/settings/payment"
                    className="account-dropdown-item"
                    onClick={() => setMenuOpen(false)}
                  >
                    <Settings size={15} /> Payment settings
                  </Link>
                  <button
                    type="button"
                    role="menuitem"
                    className="account-dropdown-item account-dropdown-danger"
                    onClick={() => void signOut()}
                    disabled={signingOut}
                  >
                    <LogOut size={15} /> {signingOut ? "Signing out…" : "Log out"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <nav className="merchant-mobile-nav" aria-label="Merchant mobile navigation">
          {navItems.map(({ label, path, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              end
              className={({ isActive }) =>
                isActive ||
                (path === "/inventory" &&
                  (location.pathname.startsWith("/products") ||
                    location.pathname.startsWith("/inventory")))
                  ? "active"
                  : ""
              }
            >
              <Icon size={17} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {children}
      </div>
    </div>
  );
}
