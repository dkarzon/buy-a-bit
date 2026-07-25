import { PackageOpen } from "lucide-react";

import { AccountShell } from "../components/AccountShell";
import { Money, StatusPill } from "../components/ui";
import { relativeTime } from "../lib/api-data";
import { trpc } from "../lib/trpc";

type AccountOrder = {
  id: string;
  productName: string;
  itemCount: number;
  merchantName: string;
  status: "pending" | "paid" | "failed";
  totalCents: number;
  createdAt: Date | string;
  paidAt: Date | string | null;
};

export function AccountOrdersPage() {
  const ordersQuery = trpc.account.listOrders.useQuery();
  const orders = (ordersQuery.data ?? []) as AccountOrder[];

  return (
    <AccountShell>
      <section>
        <h2 className="text-base font-semibold">Your orders</h2>
        <p className="mt-1 text-xs text-muted">
          Orders placed while signed in, across every Buy-a-bit store.
        </p>
      </section>

      {ordersQuery.isPending && (
        <p className="text-sm text-muted">Loading your orders…</p>
      )}

      {ordersQuery.isError && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">
          {ordersQuery.error.message}
        </p>
      )}

      {!ordersQuery.isPending && !ordersQuery.isError && orders.length === 0 && (
        <div className="empty-state">
          <PackageOpen size={22} />
          <strong>No orders yet</strong>
          <span>Orders you place while signed in will show up here.</span>
        </div>
      )}

      <div className="grid gap-3">
        {orders.map((order) => (
          <article key={order.id} className="settings-card !gap-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-sm font-semibold">{order.productName}</h3>
                <p className="mt-1 text-xs text-muted">
                  {order.merchantName} · {order.itemCount}{" "}
                  {order.itemCount === 1 ? "item" : "items"} ·{" "}
                  {relativeTime(order.createdAt)}
                </p>
              </div>
              <StatusPill status={order.status} />
            </div>
            <div className="flex items-center justify-between border-t border-[#e6e8ed] pt-2 text-sm">
              <span className="text-muted">Total</span>
              <strong>
                <Money cents={order.totalCents} />
              </strong>
            </div>
          </article>
        ))}
      </div>
    </AccountShell>
  );
}
