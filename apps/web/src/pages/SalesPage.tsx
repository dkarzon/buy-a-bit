import { CreditCard, RefreshCw, ShoppingBag, TrendingUp } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";

import { MerchantShell } from "../components/MerchantShell";
import { Button, Money, StatusPill } from "../components/ui";
import { relativeTime } from "../lib/api-data";
import type { OrderListRecord } from "../lib/api-data";
import { trpc } from "../lib/trpc";

type OrderFilter = "all" | "pending" | "paid" | "failed";

export function SalesPage() {
  const [filter, setFilter] = useState<OrderFilter>("all");
  const ordersQuery = trpc.order.listForMerchant.useQuery(
    filter === "all" ? { limit: 100 } : { limit: 100, status: filter },
  );
  const orders = (ordersQuery.data ?? []) as OrderListRecord[];
  const paidOrders = orders.filter((order) => order.status === "paid");
  const revenue = paidOrders.reduce((total, order) => total + order.totalCents, 0);
  const average = paidOrders.length ? Math.round(revenue / paidOrders.length) : 0;

  return (
    <MerchantShell title="Sales" searchPlaceholder="Search orders...">
      <main className="dashboard-content">
        <div className="page-heading">
          <div>
            <h1>Sales</h1>
            <p>Track orders and payment status from your store.</p>
          </div>
          <Button variant="secondary" onClick={() => void ordersQuery.refetch()}>
            <RefreshCw size={16} /> Refresh
          </Button>
        </div>

        <section className="stats-grid">
          <SalesMetric icon={<CreditCard />} label="Paid revenue" value={<Money cents={revenue} />} />
          <SalesMetric icon={<ShoppingBag />} label="Orders" value={orders.length} />
          <SalesMetric icon={<TrendingUp />} label="Average order" value={<Money cents={average} />} />
        </section>

        <section className="data-panel">
          <div className="data-panel-header">
            <div><h2>Orders</h2><p>Customer orders stored for this merchant.</p></div>
            <label className="filter-control">
              <span>Status</span>
              <select value={filter} onChange={(event) => setFilter(event.target.value as OrderFilter)}>
                <option value="all">All orders</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
            </label>
          </div>

          {ordersQuery.isPending ? (
            <div className="empty-state">Loading sales from the database…</div>
          ) : ordersQuery.isError ? (
            <div className="empty-state">
              <strong>Sales could not be loaded</strong>
              <span>{ordersQuery.error.message}</span>
              <Button variant="secondary" onClick={() => void ordersQuery.refetch()}>Try again</Button>
            </div>
          ) : orders.length === 0 ? (
            <div className="empty-state"><ShoppingBag size={30} /><strong>No matching orders</strong><span>Orders will appear after customers begin checkout.</span></div>
          ) : (
            <div className="responsive-table">
              <table>
                <thead><tr><th>Order</th><th>Customer</th><th>Product</th><th>Status</th><th>Total</th><th>Created</th></tr></thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td><strong>#{order.id.slice(0, 8).toUpperCase()}</strong></td>
                      <td><div className="table-primary"><strong>{order.customerName}</strong><span>{order.customerEmail}</span></div></td>
                      <td>{order.productName}</td>
                      <td><StatusPill status={order.status} /></td>
                      <td><strong><Money cents={order.totalCents} /></strong></td>
                      <td className="text-muted">{relativeTime(order.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </MerchantShell>
  );
}

function SalesMetric({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <article className="stat-card">
      <span className="stat-icon">{icon}</span>
      <p>{label}</p>
      <strong>{value}</strong>
    </article>
  );
}
