import { AlertTriangle, ArrowLeft, Package, Printer } from "lucide-react";
import { Link } from "react-router-dom";

import { MerchantShell } from "../components/MerchantShell";
import { Button } from "../components/ui";
import { productPlaceholder } from "../lib/api-data";
import type { ProductMerchantDetail, ProductRecord } from "../lib/api-data";
import { trpc } from "../lib/trpc";

export function InventoryQrPage() {
  const productsQuery = trpc.product.list.useQuery();
  const products = (productsQuery.data ?? []) as ProductRecord[];

  const detailQueries = trpc.useQueries((t) =>
    products.map((product) =>
      t.product.get(
        { id: product.id },
        {
          enabled: productsQuery.isSuccess && products.length > 0,
          staleTime: 60_000,
        },
      ),
    ),
  );

  const details = detailQueries
    .map((query) => query.data as ProductMerchantDetail | null | undefined)
    .filter((product): product is ProductMerchantDetail => Boolean(product));

  const loadingDetails =
    productsQuery.isSuccess &&
    products.length > 0 &&
    detailQueries.some((query) => query.isPending);
  const detailError = detailQueries.find((query) => query.isError)?.error;

  return (
    <MerchantShell
      title="Inventory"
      searchPlaceholder="Search QR codes..."
      action={
        <Link to="/inventory" className="button button-secondary button-sm">
          <ArrowLeft size={15} /> Inventory
        </Link>
      }
    >
      <main className="dashboard-content">
        <div className="page-heading">
          <div>
            <h1>Product QR codes</h1>
            <p>Print-ready QR codes for every product in your inventory.</p>
          </div>
          <Button variant="secondary" onClick={() => window.print()} disabled={details.length === 0}>
            <Printer size={16} /> Print all
          </Button>
        </div>

        {productsQuery.isPending || loadingDetails ? (
          <div className="empty-state mt-6">Loading QR codes for your inventory…</div>
        ) : productsQuery.isError ? (
          <div className="empty-state mt-6">
            <AlertTriangle size={28} />
            <strong>Inventory could not be loaded</strong>
            <span>{productsQuery.error.message}</span>
            <Button variant="secondary" onClick={() => void productsQuery.refetch()}>Try again</Button>
          </div>
        ) : detailError ? (
          <div className="empty-state mt-6">
            <AlertTriangle size={28} />
            <strong>QR codes could not be loaded</strong>
            <span>{detailError.message}</span>
            <Button
              variant="secondary"
              onClick={() => {
                for (const query of detailQueries) void query.refetch();
              }}
            >
              Try again
            </Button>
          </div>
        ) : products.length === 0 ? (
          <div className="empty-state mt-6">
            <Package size={30} />
            <strong>No products yet</strong>
            <span>Create a product first, then return here for QR codes.</span>
            <Link to="/products/new" className="button button-primary button-sm">Create product</Link>
          </div>
        ) : (
          <section className="qr-gallery" aria-label="Inventory QR codes">
            {details.map((product) => (
              <article className="qr-card" key={product.id}>
                <div className="qr-card-product">
                  <img src={product.imageUrl ?? productPlaceholder} alt="" />
                  <div>
                    <h2>{product.name}</h2>
                    <p>/{product.slug}</p>
                  </div>
                </div>
                <img className="qr-card-code" src={product.qrDataUrl} alt={`QR code for ${product.name}`} />
                <div className="qr-card-actions">
                  <a className="table-action" href={product.landingPageUrl} target="_blank" rel="noreferrer">
                    Open landing page
                  </a>
                  <Link className="table-action" to={`/products/${product.id}`}>Edit product</Link>
                </div>
              </article>
            ))}
          </section>
        )}
      </main>
    </MerchantShell>
  );
}
