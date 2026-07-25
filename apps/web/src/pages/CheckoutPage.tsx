import { Apple, Check, ChevronLeft, CreditCard, LockKeyhole, ShieldCheck, X } from "lucide-react";
import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { Brand, Button, Field, Money } from "../components/ui";
import { products } from "../lib/mock-data";

type PaymentOption = "card" | "apple" | "google";

export function CheckoutPage() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const product = products.find((item) => item.id === productId) ?? products[2];
  const [payment, setPayment] = useState<PaymentOption>("card");

  function completePayment(event: FormEvent) {
    event.preventDefault();
    navigate(`/payment/complete?session=mock_${Date.now()}`);
  }

  return (
    <div className="checkout-page">
      <header className="checkout-header">
        <button onClick={() => navigate(-1)} aria-label="Back"><ChevronLeft size={20} /></button>
        <Brand compact />
        <button onClick={() => navigate(`/p/${product.slug}`)} aria-label="Close"><X size={19} /></button>
      </header>

      <form className="checkout-main" onSubmit={completePayment}>
        <div className="progress-steps" aria-label="Checkout progress">
          <b /><span /><span />
        </div>

        <section className="summary-card">
          <p className="eyebrow">Order summary</p>
          <div className="flex gap-3">
            <img src={product.image} alt="" />
            <div className="min-w-0 flex-1">
              <h1>{product.name}</h1>
              <p>Merchant blue · Express delivery</p>
              <p>Qty 1</p>
            </div>
          </div>
          <div className="summary-total">
            <span>Total amount</span>
            <strong><Money value={product.price} /></strong>
          </div>
        </section>

        <section className="checkout-section">
          <h2>Contact information</h2>
          <Field label="Full name" name="name" placeholder="Enter your full name" required />
          <Field label="Email address" name="email" type="email" placeholder="name@example.com" required />
        </section>

        <section className="checkout-section">
          <h2>Payment method</h2>
          <div className="payment-options">
            <PaymentChoice
              active={payment === "card"}
              icon={<CreditCard size={18} />}
              label="Credit or debit card"
              onClick={() => setPayment("card")}
            >
              <span className="card-mini">VISA</span>
              <span className="card-mini">MC</span>
            </PaymentChoice>
            <PaymentChoice
              active={payment === "apple"}
              icon={<Apple size={18} />}
              label="Apple Pay"
              onClick={() => setPayment("apple")}
            />
            <PaymentChoice
              active={payment === "google"}
              icon={<span className="google-g">G</span>}
              label="Google Pay"
              onClick={() => setPayment("google")}
            />
          </div>
        </section>

        <div className="checkout-trust"><LockKeyhole size={14} /> Secure SSL encryption</div>
        <Button type="submit" className="w-full">
          <ShieldCheck size={18} /> Continue to secure payment
        </Button>
        <p className="checkout-terms">By continuing, you agree to our Terms of Service and Privacy Policy.</p>
      </form>
    </div>
  );
}

function PaymentChoice({
  active,
  icon,
  label,
  onClick,
  children,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
  children?: ReactNode;
}) {
  return (
    <button type="button" className={active ? "active" : ""} onClick={onClick}>
      {icon}
      <span>{label}</span>
      <span className="ml-auto flex items-center gap-1">{children}</span>
      <i>{active && <Check size={12} />}</i>
    </button>
  );
}
