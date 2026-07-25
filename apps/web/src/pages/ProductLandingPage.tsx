import { ArrowLeft, Check, Heart, LockKeyhole, Share2, ShieldCheck, ShoppingCart } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { Brand, Button, Money } from "../components/ui";
import { products } from "../lib/mock-data";

export function ProductLandingPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [colour, setColour] = useState("Merchant blue");
  const product = products.find((item) => item.slug === slug) ?? products[2];

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
          <img src={product.image} alt={product.name} />
          <div className="image-dots" aria-label="Image 1 of 3"><b /><span /><span /></div>
        </section>

        <section className="product-info">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1>{product.name}</h1>
              <strong className="product-price"><Money value={product.price} /></strong>
            </div>
            <button className="icon-button" aria-label="Add to favourites"><Heart size={19} /></button>
          </div>

          <div>
            <h2>Description</h2>
            <p>{product.description}</p>
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
        <Button onClick={() => navigate(`/checkout/${product.id}`)} className="flex-1">
          Buy now <span aria-hidden>→</span>
        </Button>
      </div>
      <Link className="sr-only" to="/checkout/prod_3">Checkout</Link>
    </div>
  );
}
