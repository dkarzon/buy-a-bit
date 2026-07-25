import {
  Bell,
  ChevronDown,
  CircleHelp,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Package,
  Plus,
  QrCode,
  Search,
  Settings,
  ShoppingBag,
  Users,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { Brand, Money, StatusPill } from "../components/ui";
import { authClient } from "../lib/auth-client";
import { dashboardStats, merchant, orders, products } from "../lib/mock-data";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, active: true },
  { label: "Inventory", icon: Package },
  { label: "Sales", icon: CreditCard },
  { label: "Customers", icon: Users },
  { label: "Analytics", icon: ShoppingBag },
];

export function DashboardPage() {
  const navigate = useNavigate();

  async function signOut() {
    await authClient.signOut();
    navigate("/login");
  }

  return (
    <div className="dashboard-shell">
      <aside className="sidebar">
        <Brand />
        <nav className="sidebar-nav" aria-label="Merchant navigation">
          {navItems.map(({ label, icon: Icon, active }) => (
            <a key={label} href={`#${label.toLowerCase()}`} className={active ? "active" : ""}>
              <Icon size={17} />
              {label}
            </a>
          ))}
        </nav>
        <div className="mt-auto grid gap-2">
          <a href="#help" className="sidebar-link"><CircleHelp size={17} /> Help</a>
          <button type="button" className="sidebar-upgrade" onClick={() => void signOut()}>
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>

      <div className="dashboard-main">
        <header className="dashboard-header">
          <div className="flex items-center gap-4">
            <span className="text-sm font-semibold">Dashboard</span>
            <label className="dashboard-search">
              <Search size={15} />
              <input aria-label="Search" placeholder="Search products, orders..." />
            </label>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/products/new" className="button button-primary button-sm">
              <Plus size={15} /> Add product
            </Link>
            <button className="icon-button" aria-label="Notifications"><Bell size={17} /></button>
            <button className="icon-button" aria-label="Settings"><Settings size={17} /></button>
            <button className="avatar" aria-label="Account menu">{merchant.name[0]}</button>
          </div>
        </header>

        <main className="dashboard-content">
          <section className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <h1>Hello, {merchant.name}!</h1>
              <p className="mt-1 text-sm text-muted">Here’s what’s happening with your store today.</p>
            </div>
            <Link to="/p/executive-slim-wallet" className="button button-secondary">
              <QrCode size={17} /> Preview store QR
            </Link>
          </section>

          <section className="stats-grid" aria-label="Store overview">
            {dashboardStats.map((stat, index) => (
              <article className="stat-card" key={stat.label}>
                <div className="flex items-start justify-between">
                  <span className="stat-icon">
                    {index === 0 ? <CreditCard /> : index === 1 ? <Package /> : <ShoppingBag />}
                  </span>
                  <span className={index === 2 ? "status status-neutral" : "trend"}>{stat.change}</span>
                </div>
                <p>{stat.label}</p>
                <strong>{stat.value}</strong>
              </article>
            ))}
          </section>

          <section className="dashboard-lower">
            <div>
              <div className="section-heading">
                <h2>Live inventory</h2>
                <a href="#inventory">View all</a>
              </div>
              <div className="product-grid">
                {products.map((product) => (
                  <article className="product-card" key={product.id}>
                    <img src={product.image} alt="" />
                    <div className="min-w-0 flex-1">
                      <h3>{product.name}</h3>
                      <strong><Money value={product.price} /></strong>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className={`inventory ${product.status === "Low stock" ? "low" : ""}`}>
                          {product.status}
                        </span>
                        <span className="text-xs text-muted">{product.inventory} left</span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <div>
              <div className="section-heading">
                <h2>Recent orders</h2>
                <button aria-label="Filter orders"><ChevronDown size={17} /></button>
              </div>
              <div className="order-list">
                {orders.map((order) => (
                  <article className="order-row" key={order.id}>
                    <span className="order-avatar">{order.initials}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <h3>{order.customer}</h3>
                        <strong>${order.amount.toFixed(2)}</strong>
                      </div>
                      <p>{order.id} · {order.time}</p>
                      <StatusPill status={order.status} />
                    </div>
                  </article>
                ))}
                <a className="order-list-footer" href="#orders">View all transactions</a>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
