import { AlertTriangle, Package, Plus, QrCode } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { MerchantShell } from "../components/MerchantShell";
import { Button, Money } from "../components/ui";
import { productPlaceholder } from "../lib/api-data";
import type { ProductRecord } from "../lib/api-data";
import { trpc } from "../lib/trpc";

export function InventoryPage() {
  const productsQuery = trpc.product.list.useQuery();
  const products = (productsQuery.data ?? []) as ProductRecord[];
  const active = products.filter((product) => product.isAvailable).length;
  const units = products.reduce((total, product) => total + (product.stockCount ?? 0), 0);
  const lowStock = products.filter((product) => (product.stockCount ?? 0) < 5).length;

  return (
    <MerchantShell
      title="Inventory"
      searchPlaceholder="Search inventory..."
      action={<Link to="/products/new" className="button button-primary button-sm"><Plus size={15} /> Add product</Link>}
    >
      <main className="dashboard-content">
        <div className="page-heading">
          <div>
            <h1>Inventory</h1>
            <p>Manage products, stock levels, pricing and availability.</p>
          </div>
          <Link to="/inventory/qr" className="button button-secondary">
            <QrCode size={16} /> View all QR codes
          </Link>
        </div>

        <section className="stats-grid">
          <Metric icon={<Package />} label="Products" value={String(products.length)} />
          <Metric icon={<Package />} label="Available units" value={String(units)} />
          <Metric icon={<AlertTriangle />} label="Low stock" value={String(lowStock)} tone={lowStock > 0 ? "warning" : undefined} />
        </section>

        <section className="data-panel">
          <div className="data-panel-header">
            <div>
              <h2>All products</h2>
              <p>{active} active · {products.length - active} unavailable</p>
            </div>
          </div>

          {productsQuery.isPending ? (
            <div className="empty-state">Loading inventory from the database…</div>
          ) : productsQuery.isError ? (
            <div className="empty-state">
              <AlertTriangle size={28} />
              <strong>Inventory could not be loaded</strong>
              <span>{productsQuery.error.message}</span>
              <Button onClick={() => void productsQuery.refetch()} variant="secondary">Try again</Button>
            </div>
          ) : products.length === 0 ? (
            <div className="empty-state">
              <Package size={30} />
              <strong>No products in your inventory</strong>
              <span>Create a product to populate this view.</span>
              <Link to="/products/new" className="button button-primary button-sm">Create product</Link>
            </div>
          ) : (
            <div className="responsive-table">
              <table>
                <thead>
                  <tr><th>Product</th><th>Status</th><th>Stock</th><th>Price</th><th aria-label="Actions" /></tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id}>
                      <td>
                        <Link className="table-entity" to={`/p/${product.slug}`} title="Open public product page">
                          <img src={product.imageUrl ?? productPlaceholder} alt="" />
                          <div><strong>{product.name}</strong><span>/{product.slug}</span></div>
                        </Link>
                      </td>
                      <td><span className={`status ${product.isAvailable ? "status-paid" : "status-failed"}`}>{product.isAvailable ? "Active" : "Unavailable"}</span></td>
                      <td><span className={(product.stockCount ?? 0) < 5 ? "text-amber-700 font-semibold" : ""}>{product.stockCount ?? 0}</span></td>
                      <td><strong><Money cents={product.priceCents} /></strong></td>
                      <td>
                        <div className="flex items-center gap-3">
                          <Link className="table-action" to={`/p/${product.slug}`}>View</Link>
                          <Link className="table-action" to={`/products/${product.id}`}>Edit</Link>
                        </div>
                      </td>
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

function Metric({ icon, label, value, tone }: { icon: ReactNode; label: string; value: string; tone?: "warning" }) {
  return (
    <article className="stat-card">
      <span className={`stat-icon ${tone === "warning" ? "metric-warning" : ""}`}>{icon}</span>
      <p>{label}</p>
      <strong>{value}</strong>
    </article>
  );
}
