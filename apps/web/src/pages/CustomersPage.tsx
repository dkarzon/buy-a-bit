import { Mail, ShoppingBag, UserRoundCheck, Users } from "lucide-react";
import type { ReactNode } from "react";

import { MerchantShell } from "../components/MerchantShell";
import { Button, Money } from "../components/ui";
import { initials, relativeTime } from "../lib/api-data";
import type { OrderListRecord } from "../lib/api-data";
import { trpc } from "../lib/trpc";

type CustomerSummary = {
  email: string;
  name: string;
  orders: number;
  paidCents: number;
  lastOrder: Date;
};

export function CustomersPage() {
  const ordersQuery = trpc.order.listForMerchant.useQuery({ limit: 100 });
  const orders = (ordersQuery.data ?? []) as OrderListRecord[];
  const customers = Array.from(
    orders.reduce((map, order) => {
      const key = order.customerEmail.toLowerCase();
      const current = map.get(key);
      const createdAt = order.createdAt instanceof Date ? order.createdAt : new Date(order.createdAt);
      map.set(key, {
        email: order.customerEmail,
        name: order.customerName,
        orders: (current?.orders ?? 0) + 1,
        paidCents: (current?.paidCents ?? 0) + (order.status === "paid" ? order.priceCents : 0),
        lastOrder: current && current.lastOrder > createdAt ? current.lastOrder : createdAt,
      });
      return map;
    }, new Map<string, CustomerSummary>()).values(),
  ).sort((a, b) => b.lastOrder.getTime() - a.lastOrder.getTime());
  const returning = customers.filter((customer) => customer.orders > 1).length;
  const customerValue = customers.length
    ? Math.round(customers.reduce((total, customer) => total + customer.paidCents, 0) / customers.length)
    : 0;

  return (
    <MerchantShell title="Customers" searchPlaceholder="Search customers...">
      <main className="dashboard-content">
        <div className="page-heading">
          <div><h1>Customers</h1><p>Customer profiles derived from your order history.</p></div>
        </div>

        <section className="stats-grid">
          <CustomerMetric icon={<Users />} label="Customers" value={String(customers.length)} />
          <CustomerMetric icon={<UserRoundCheck />} label="Returning customers" value={String(returning)} />
          <CustomerMetric icon={<ShoppingBag />} label="Average customer value" value={<Money cents={customerValue} />} />
        </section>

        <section className="data-panel">
          <div className="data-panel-header">
            <div><h2>Customer directory</h2><p>Grouped by the email recorded on each order.</p></div>
          </div>

          {ordersQuery.isPending ? (
            <div className="empty-state">Loading customers from order data…</div>
          ) : ordersQuery.isError ? (
            <div className="empty-state">
              <strong>Customers could not be loaded</strong>
              <span>{ordersQuery.error.message}</span>
              <Button variant="secondary" onClick={() => void ordersQuery.refetch()}>Try again</Button>
            </div>
          ) : customers.length === 0 ? (
            <div className="empty-state"><Users size={30} /><strong>No customers yet</strong><span>Customer records are created from submitted orders.</span></div>
          ) : (
            <div className="responsive-table">
              <table>
                <thead><tr><th>Customer</th><th>Orders</th><th>Paid value</th><th>Last order</th><th aria-label="Contact" /></tr></thead>
                <tbody>
                  {customers.map((customer) => (
                    <tr key={customer.email}>
                      <td>
                        <div className="table-customer">
                          <span className="order-avatar">{initials(customer.name)}</span>
                          <div className="table-primary"><strong>{customer.name}</strong><span>{customer.email}</span></div>
                        </div>
                      </td>
                      <td>{customer.orders}</td>
                      <td><strong><Money cents={customer.paidCents} /></strong></td>
                      <td className="text-muted">{relativeTime(customer.lastOrder)}</td>
                      <td><a className="table-action" href={`mailto:${customer.email}`}><Mail size={15} /> Email</a></td>
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

function CustomerMetric({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return <article className="stat-card"><span className="stat-icon">{icon}</span><p>{label}</p><strong>{value}</strong></article>;
}
