import { ArrowLeft, Check, Heart, LockKeyhole, Share2, ShieldCheck, ShoppingCart } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { Brand, Button, Money } from "../components/ui";
import { productPlaceholder } from "../lib/api-data";
import type { ProductPublic } from "../lib/api-data";
import { trpc } from "../lib/trpc";

export function ProductLandingPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [colour, setColour] = useState("Merchant blue");
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
        <div className="flex items-center gap-1">
          <button aria-label="Share"><Share2 size={18} /></button>
          <button aria-label="Cart"><ShoppingCart size={19} /></button>
        </div>
      </header>

      <main className="product-view">
        <section className="product-image">
          <img src={product.imageUrl ?? productPlaceholder} alt={product.name} />
          <div className="image-dots" aria-label="Image 1 of 3"><b /><span /><span /></div>
        </section>

        <section className="product-info">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1>{product.name}</h1>
              <strong className="product-price"><Money cents={product.priceCents} /></strong>
            </div>
            <button className="icon-button" aria-label="Add to favourites"><Heart size={19} /></button>
          </div>

          <div>
            <h2>Description</h2>
            <p>{product.description ?? "No description has been provided for this product."}</p>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <h2>Colour</h2>
              <span className="text-xs font-medium text-primary">{colour}</span>
            </div>
            <div className="colour-picker">
              {[
                ["Merchant blue", "#0648a6"],
                ["Midnight", "#20262c"],
                ["Slate", "#667085"],
              ].map(([name, value]) => (
                <button
                  key={name}
                  onClick={() => setColour(name)}
                  aria-label={name}
                  className={colour === name ? "selected" : ""}
                  style={{ backgroundColor: value }}
                >
                  {colour === name && <Check size={14} />}
                </button>
              ))}
            </div>
          </div>

          <div className="feature-chips">
            <span><ShieldCheck size={14} /> Genuine leather</span>
            <span><LockKeyhole size={14} /> RFID protected</span>
            <span><Check size={14} /> Free express shipping</span>
          </div>
        </section>
      </main>

      <div className="purchase-bar">
        <button className="cart-button" aria-label="Add to cart"><ShoppingCart size={19} /></button>
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
