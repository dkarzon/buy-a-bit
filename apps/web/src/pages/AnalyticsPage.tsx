import { BarChart3, CreditCard, Package, ShoppingBag, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";

import { MerchantShell } from "../components/MerchantShell";
import { Button, Money } from "../components/ui";
import type { OrderListRecord, ProductRecord } from "../lib/api-data";
import { trpc } from "../lib/trpc";

export function AnalyticsPage() {
  const ordersQuery = trpc.order.listForMerchant.useQuery({ limit: 100 });
  const productsQuery = trpc.product.list.useQuery();
  const orders = (ordersQuery.data ?? []) as OrderListRecord[];
  const products = (productsQuery.data ?? []) as ProductRecord[];
  const paidOrders = orders.filter((order) => order.status === "paid");
  const revenue = paidOrders.reduce((total, order) => total + order.priceCents, 0);
  const conversion = orders.length ? Math.round((paidOrders.length / orders.length) * 100) : 0;
  const inventoryValue = products.reduce(
    (total, product) => total + product.priceCents * (product.stockCount ?? 0),
    0,
  );
  const statusCounts = {
    paid: orders.filter((order) => order.status === "paid").length,
    pending: orders.filter((order) => order.status === "pending").length,
    failed: orders.filter((order) => order.status === "failed").length,
  };
  const productRevenue = Array.from(
    paidOrders.reduce((map, order) => {
      map.set(order.productName, (map.get(order.productName) ?? 0) + order.priceCents);
      return map;
    }, new Map<string, number>()),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  const maxRevenue = Math.max(...productRevenue.map(([, value]) => value), 1);
  const loading = ordersQuery.isPending || productsQuery.isPending;
  const error = ordersQuery.error ?? productsQuery.error;

  return (
    <MerchantShell title="Analytics" searchPlaceholder="Search reports...">
      <main className="dashboard-content">
        <div className="page-heading">
          <div><h1>Analytics</h1><p>Performance insights calculated from products and orders.</p></div>
          <Button
            variant="secondary"
            onClick={() => {
              void ordersQuery.refetch();
              void productsQuery.refetch();
            }}
          >
            Refresh data
          </Button>
        </div>

        <section className="analytics-stats">
          <AnalyticsMetric icon={<CreditCard />} label="Paid revenue" value={<Money cents={revenue} />} />
          <AnalyticsMetric icon={<ShoppingBag />} label="Orders" value={String(orders.length)} />
          <AnalyticsMetric icon={<TrendingUp />} label="Payment success" value={`${conversion}%`} />
          <AnalyticsMetric icon={<Package />} label="Inventory value" value={<Money cents={inventoryValue} />} />
        </section>

        {loading ? (
          <div className="empty-state mt-6">Calculating analytics from database records…</div>
        ) : error ? (
          <div className="empty-state mt-6"><strong>Analytics could not be loaded</strong><span>{error.message}</span></div>
        ) : (
          <section className="analytics-grid">
            <article className="data-panel">
              <div className="data-panel-header"><div><h2>Revenue by product</h2><p>Paid order value across your top products.</p></div><BarChart3 size={20} className="text-primary" /></div>
              {productRevenue.length === 0 ? (
                <div className="empty-state"><BarChart3 size={28} /><strong>No revenue data yet</strong><span>Paid orders will populate this chart.</span></div>
              ) : (
                <div className="bar-chart">
                  {productRevenue.map(([name, value]) => (
                    <div className="bar-row" key={name}>
                      <span title={name}>{name}</span>
                      <div><i style={{ width: `${Math.max(5, (value / maxRevenue) * 100)}%` }} /></div>
                      <strong>${(value / 100).toFixed(0)}</strong>
                    </div>
                  ))}
                </div>
              )}
            </article>

            <article className="data-panel">
              <div className="data-panel-header"><div><h2>Order health</h2><p>Current payment status distribution.</p></div></div>
              <div className="status-breakdown">
                <div
                  className="donut"
                  style={{
                    background: orders.length
                      ? `conic-gradient(#177245 0 ${(statusCounts.paid / orders.length) * 100}%, #d89b20 0 ${((statusCounts.paid + statusCounts.pending) / orders.length) * 100}%, #ba1a1a 0)`
                      : "var(--surface-container)",
                  }}
                >
                  <span><strong>{orders.length}</strong><small>orders</small></span>
                </div>
                <div className="chart-legend">
                  <Legend color="#177245" label="Paid" value={statusCounts.paid} />
                  <Legend color="#d89b20" label="Pending" value={statusCounts.pending} />
                  <Legend color="#ba1a1a" label="Failed" value={statusCounts.failed} />
                </div>
              </div>
            </article>
          </section>
        )}
      </main>
    </MerchantShell>
  );
}

function AnalyticsMetric({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return <article className="stat-card"><span className="stat-icon">{icon}</span><p>{label}</p><strong>{value}</strong></article>;
}

function Legend({ color, label, value }: { color: string; label: string; value: number }) {
  return <div><span><i style={{ background: color }} />{label}</span><strong>{value}</strong></div>;
}
