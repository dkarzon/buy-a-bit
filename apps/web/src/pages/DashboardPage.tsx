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
import {
  initials,
  productPlaceholder,
  relativeTime,
} from "../lib/api-data";
import type { OrderListRecord, ProductRecord } from "../lib/api-data";
import { trpc } from "../lib/trpc";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, active: true },
  { label: "Inventory", icon: Package },
  { label: "Sales", icon: CreditCard },
  { label: "Customers", icon: Users },
  { label: "Analytics", icon: ShoppingBag },
];

export function DashboardPage() {
  const navigate = useNavigate();
  const merchantQuery = trpc.merchant.me.useQuery();
  const productsQuery = trpc.product.list.useQuery();
  const ordersQuery = trpc.order.listForMerchant.useQuery({ limit: 4 });
  const products = (productsQuery.data ?? []) as ProductRecord[];
  const orders = (ordersQuery.data ?? []) as OrderListRecord[];
  const merchant = merchantQuery.data;
  const paidTotal = orders
    .filter((order) => order.status === "paid")
    .reduce((total, order) => total + order.priceCents, 0);
  const stats = [
    { label: "Total sales", value: `$${(paidTotal / 100).toFixed(2)}`, change: "Loaded from orders" },
    { label: "Active products", value: String(products.filter((product) => product.isAvailable).length), change: "Live inventory" },
    { label: "Recent orders", value: String(orders.length), change: "Latest 4" },
  ];

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
            <button className="avatar" aria-label="Account menu">
              {initials(merchant?.user.name ?? merchant?.user.email ?? "Merchant")}
            </button>
          </div>
        </header>

        <main className="dashboard-content">
          <section className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <h1>Hello, {merchant?.user.name ?? "Merchant"}!</h1>
              <p className="mt-1 text-sm text-muted">Here’s what’s happening with your store today.</p>
            </div>
            <Link
              to={products[0] ? `/p/${products[0].slug}` : "/products/new"}
              className="button button-secondary"
            >
              <QrCode size={17} /> Preview store QR
            </Link>
          </section>

          {(merchantQuery.isError || productsQuery.isError || ordersQuery.isError) && (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
              Some store data could not be loaded.{" "}
              <button
                className="font-semibold underline"
                onClick={() => {
                  void merchantQuery.refetch();
                  void productsQuery.refetch();
                  void ordersQuery.refetch();
                }}
              >
                Try again
              </button>
            </div>
          )}

          <section className="stats-grid" aria-label="Store overview">
            {stats.map((stat, index) => (
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
              {productsQuery.isPending ? (
                <div className="empty-state">Loading inventory…</div>
              ) : products.length === 0 ? (
                <div className="empty-state">
                  <Package size={28} />
                  <strong>No products yet</strong>
                  <span>Create your first product to start selling.</span>
                  <Link to="/products/new" className="button button-primary button-sm">Add product</Link>
                </div>
              ) : (
                <div className="product-grid">
                  {products.map((product) => (
                  <Link className="product-card" key={product.id} to={`/products/${product.id}`}>
                    <img src={product.imageUrl ?? productPlaceholder} alt="" />
                    <div className="min-w-0 flex-1">
                      <h3>{product.name}</h3>
                      <strong><Money cents={product.priceCents} /></strong>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className={`inventory ${(product.stockCount ?? 0) < 5 ? "low" : ""}`}>
                          {product.isAvailable ? ((product.stockCount ?? 0) < 5 ? "Low stock" : "Active") : "Unavailable"}
                        </span>
                        <span className="text-xs text-muted">{product.stockCount ?? 0} left</span>
                      </div>
                    </div>
                  </Link>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="section-heading">
                <h2>Recent orders</h2>
                <button aria-label="Filter orders"><ChevronDown size={17} /></button>
              </div>
              {ordersQuery.isPending ? (
                <div className="empty-state">Loading orders…</div>
              ) : orders.length === 0 ? (
                <div className="empty-state">
                  <ShoppingBag size={28} />
                  <strong>No orders yet</strong>
                  <span>New customer orders will appear here.</span>
                </div>
              ) : (
                <div className="order-list">
                  {orders.map((order) => (
                  <article className="order-row" key={order.id}>
                    <span className="order-avatar">{initials(order.customerName)}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <h3>{order.customerName}</h3>
                        <strong>${(order.priceCents / 100).toFixed(2)}</strong>
                      </div>
                      <p>{order.id.slice(0, 8)} · {relativeTime(order.createdAt)}</p>
                      <StatusPill status={order.status} />
                    </div>
                  </article>
                  ))}
                  <a className="order-list-footer" href="#orders">View all transactions</a>
                </div>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
