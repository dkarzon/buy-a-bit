import { Apple, Check, ChevronLeft, CreditCard, LockKeyhole, ShieldCheck, X } from "lucide-react";
import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { Brand, Button, Field, Money } from "../components/ui";
import { apiErrorMessage, productPlaceholder } from "../lib/api-data";
import type { ProductPublic } from "../lib/api-data";
import { trpc } from "../lib/trpc";

type PaymentOption = "card" | "apple" | "google";

export function CheckoutPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [payment, setPayment] = useState<PaymentOption>("card");
  const [error, setError] = useState<string | null>(null);
  const productQuery = trpc.product.getBySlug.useQuery(
    { slug: slug ?? "" },
    { enabled: Boolean(slug), retry: false },
  );
  const createOrder = trpc.order.create.useMutation();
  const product = productQuery.data as ProductPublic | null | undefined;

  async function completePayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!product) return;
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      const result = (await createOrder.mutateAsync({
        productId: product.id,
        customerName: String(form.get("name") ?? "").trim(),
        customerEmail: String(form.get("email") ?? "").trim(),
      })) as { orderId: string; payPath: string };
      navigate(result.payPath);
    } catch (caught) {
      setError(apiErrorMessage(caught, "Could not create your order"));
    }
  }

  if (productQuery.isPending) {
    return <main className="grid min-h-screen place-items-center text-sm text-muted">Loading checkout…</main>;
  }

  if (productQuery.isError || !product) {
    return (
      <main className="grid min-h-screen place-items-center px-6 text-center">
        <div className="grid max-w-sm gap-3">
          <h1 className="text-xl font-semibold">Checkout unavailable</h1>
          <p className="text-sm text-muted">
            {productQuery.error?.message ?? "This product could not be found."}
          </p>
          <Button onClick={() => navigate(-1)}>Go back</Button>
        </div>
      </main>
    );
  }

  return (
    <div className="checkout-page">
      <header className="checkout-header">
        <button onClick={() => navigate(-1)} aria-label="Back"><ChevronLeft size={20} /></button>
        <Brand compact />
        <button onClick={() => navigate(`/p/${product.slug}`)} aria-label="Close"><X size={19} /></button>
      </header>

      <form className="checkout-main" onSubmit={(event) => void completePayment(event)}>
        <div className="progress-steps" aria-label="Checkout progress">
          <b /><span /><span />
        </div>

        <section className="summary-card">
          <p className="eyebrow">Order summary</p>
          <div className="flex gap-3">
            <img src={product.imageUrl ?? productPlaceholder} alt="" />
            <div className="min-w-0 flex-1">
              <h1>{product.name}</h1>
              <p>Merchant blue · Express delivery</p>
              <p>Qty 1</p>
            </div>
          </div>
          <div className="summary-total">
            <span>Total amount</span>
            <strong><Money cents={product.priceCents} /></strong>
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
              label="Apple Pay (coming soon)"
              onClick={() => setPayment("apple")}
              disabled
            />
            <PaymentChoice
              active={payment === "google"}
              icon={<span className="google-g">G</span>}
              label="Google Pay (coming soon)"
              onClick={() => setPayment("google")}
              disabled
            />
          </div>
        </section>

        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
        <div className="checkout-trust"><LockKeyhole size={14} /> Secure SSL encryption</div>
        <Button type="submit" className="w-full" disabled={createOrder.isPending}>
          <ShieldCheck size={18} /> {createOrder.isPending ? "Creating order…" : "Continue to secure payment"}
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
  disabled = false,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
  children?: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button type="button" className={active ? "active" : ""} onClick={onClick} disabled={disabled}>
      {icon}
      <span>{label}</span>
      <span className="ml-auto flex items-center gap-1">{children}</span>
      <i>{active && <Check size={12} />}</i>
    </button>
  );
}
