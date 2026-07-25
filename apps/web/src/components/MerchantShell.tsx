import type { ReactNode } from "react";
import {
  BarChart3,
  Bell,
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

  async function signOut() {
    await authClient.signOut();
    navigate("/login");
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
                isActive || (path === "/inventory" && location.pathname.startsWith("/products"))
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
          <button type="button" className="sidebar-upgrade" onClick={() => void signOut()}>
            <LogOut size={16} /> Sign out
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
            <button className="avatar" aria-label="Account menu">
              {initials(account?.user.name ?? account?.user.email ?? "Merchant")}
            </button>
          </div>
        </header>

        <nav className="merchant-mobile-nav" aria-label="Merchant mobile navigation">
          {navItems.map(({ label, path, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              end
              className={({ isActive }) =>
                isActive || (path === "/inventory" && location.pathname.startsWith("/products"))
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
