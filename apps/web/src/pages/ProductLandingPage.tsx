import { ArrowLeft } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { Brand, Button, Money } from "../components/ui";
import { productPlaceholder } from "../lib/api-data";
import type { ProductPublic } from "../lib/api-data";
import { trpc } from "../lib/trpc";

export function ProductLandingPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const productQuery = trpc.product.getBySlug.useQuery(
    { slug: slug ?? "" },
    { enabled: Boolean(slug), retry: false },
  );
  const product = productQuery.data as ProductPublic | null | undefined;

  if (productQuery.isPending) {
    return <main className="grid min-h-screen place-items-center text-sm text-muted">Loading product…</main>;
  }

  if (productQuery.isError) {
    return (
      <main className="grid min-h-screen place-items-center px-6 text-center">
        <div className="grid max-w-sm gap-3">
          <h1 className="text-xl font-semibold">Could not load this product</h1>
          <p className="text-sm text-muted">{productQuery.error.message}</p>
          <Button onClick={() => void productQuery.refetch()}>Try again</Button>
        </div>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="grid min-h-screen place-items-center px-6 text-center">
        <div className="grid max-w-sm gap-3">
          <Brand />
          <h1 className="text-xl font-semibold">Product not found</h1>
          <p className="text-sm text-muted">This product does not exist or is no longer available.</p>
          <Link className="button button-secondary" to="/">Return home</Link>
        </div>
      </main>
    );
  }

  const canPurchase = product.isAvailable && product.merchant.isStoreOpen && (product.stockCount ?? 1) > 0;

  return (
    <div className="store-page">
      <header className="store-header">
        <button onClick={() => navigate(-1)} aria-label="Go back"><ArrowLeft size={19} /></button>
        <Brand compact />
        <span aria-hidden className="size-[34px]" />
      </header>

      <main className="product-view">
        <section className="product-image">
          <img src={product.imageUrl ?? productPlaceholder} alt={product.name} />
        </section>

        <section className="product-info">
          <div>
            <h1>{product.name}</h1>
            <strong className="product-price"><Money cents={product.priceCents} /></strong>
          </div>

          <div>
            <h2>Description</h2>
            <p>{product.description ?? "No description has been provided for this product."}</p>
          </div>
        </section>
      </main>

      <div className="purchase-bar">
        <Button
          onClick={() => navigate(`/checkout/${product.slug}`)}
          className="flex-1"
          disabled={!canPurchase}
        >
          {canPurchase ? "Buy now" : "Currently unavailable"} {canPurchase && <span aria-hidden>→</span>}
        </Button>
      </div>
    </div>
  );
}
