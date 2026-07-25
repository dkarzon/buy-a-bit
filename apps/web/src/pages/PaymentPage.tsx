import { CreditCard, LockKeyhole, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { Brand, Button, Field, Money } from "../components/ui";
import { apiErrorMessage } from "../lib/api-data";
import type { PaymentCheckoutContext } from "../lib/api-data";
import { trpc } from "../lib/trpc";

type CaptureClient = {
  createToken(input: {
    sourceType: "credit-card";
    cardNumber: string;
    expiryMonth: string;
    expiryYear: string;
    cvc: string;
    cardHolderName: string;
  }): Promise<{ token: string }>;
};

declare global {
  interface Window {
    Pinch?: {
      Capture(options: { publishableKey: string }): CaptureClient;
    };
  }
}

/**
 * Custom payment page — CaptureJS tokenises the card in-browser, then
 * payment.charge sends only creditCardToken to the API (no Payment Links).
 */
export function PaymentPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [scriptReady, setScriptReady] = useState(Boolean(window.Pinch));
  const [error, setError] = useState<string | null>(null);
  const checkoutQuery = trpc.payment.getCheckoutContext.useQuery(
    { orderId: orderId ?? "" },
    { enabled: Boolean(orderId), retry: false },
  );
  const charge = trpc.payment.charge.useMutation();
  const checkout = checkoutQuery.data as PaymentCheckoutContext | undefined;

  useEffect(() => {
    if (window.Pinch) {
      setScriptReady(true);
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>("script[data-pinch-capture]");
    const script = existing ?? document.createElement("script");
    const loaded = () => setScriptReady(true);
    const failed = () => setError("Secure card fields could not be loaded.");
    script.addEventListener("load", loaded);
    script.addEventListener("error", failed);
    if (!existing) {
      script.src = "https://cdn.getpinch.com.au/capturejs/pinch.capture.v2.js";
      script.async = true;
      script.dataset.pinchCapture = "true";
      document.head.appendChild(script);
    }
    return () => {
      script.removeEventListener("load", loaded);
      script.removeEventListener("error", failed);
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!checkout || !orderId || !window.Pinch) {
      setError("Secure card tokenisation is not ready. Please try again.");
      return;
    }
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      const capture = window.Pinch.Capture({ publishableKey: checkout.publishableKey });
      const { token } = await capture.createToken({
        sourceType: "credit-card",
        cardHolderName: String(form.get("cardHolderName") ?? ""),
        cardNumber: String(form.get("cardNumber") ?? "").replace(/\s/g, ""),
        expiryMonth: String(form.get("expiryMonth") ?? ""),
        expiryYear: String(form.get("expiryYear") ?? ""),
        cvc: String(form.get("cvc") ?? ""),
      });
      const result = (await charge.mutateAsync({
        orderId,
        creditCardToken: token,
      })) as { confirmationPath: string };
      navigate(result.confirmationPath);
    } catch (caught) {
      setError(apiErrorMessage(caught, "Payment could not be completed"));
    }
  }

  if (checkoutQuery.isPending) {
    return <main className="grid min-h-screen place-items-center text-sm text-muted">Loading secure payment…</main>;
  }

  if (checkoutQuery.isError || !checkout) {
    return (
      <main className="grid min-h-screen place-items-center px-6 text-center">
        <div className="grid max-w-sm gap-3">
          <h1 className="text-xl font-semibold">Payment unavailable</h1>
          <p className="text-sm text-muted">{checkoutQuery.error?.message ?? "This order could not be loaded."}</p>
          <Button onClick={() => void checkoutQuery.refetch()}>Try again</Button>
        </div>
      </main>
    );
  }

  return (
    <div className="checkout-page">
      <header className="checkout-header"><Brand compact /></header>
      <form className="checkout-main" onSubmit={(event) => void submit(event)}>
        <div>
          <p className="eyebrow">Secure payment</p>
          <h1 className="mt-2 text-2xl font-semibold">{checkout.productName}</h1>
          <p className="mt-1 text-sm text-muted">Order for {checkout.customerName}</p>
        </div>
        <section className="summary-card">
          <div className="summary-total border-0 pt-0">
            <span>Total amount</span>
            <strong><Money cents={checkout.priceCents} /></strong>
          </div>
        </section>
        <section className="checkout-section">
          <h2 className="flex items-center gap-2"><CreditCard size={18} /> Card details</h2>
          <Field label="Cardholder name" name="cardHolderName" autoComplete="cc-name" required />
          <Field label="Card number" name="cardNumber" inputMode="numeric" autoComplete="cc-number" placeholder="4242 4242 4242 4242" required />
          <div className="grid grid-cols-3 gap-2">
            <Field label="MM" name="expiryMonth" inputMode="numeric" autoComplete="cc-exp-month" placeholder="12" required />
            <Field label="YYYY" name="expiryYear" inputMode="numeric" autoComplete="cc-exp-year" placeholder="2028" required />
            <Field label="CVC" name="cvc" inputMode="numeric" autoComplete="cc-csc" placeholder="123" required />
          </div>
        </section>
        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
        <div className="checkout-trust"><LockKeyhole size={14} /> Card details are tokenised securely by Pinch</div>
        <Button type="submit" disabled={!scriptReady || charge.isPending}>
          <ShieldCheck size={18} /> {charge.isPending ? "Processing payment…" : scriptReady ? "Pay securely" : "Loading secure fields…"}
        </Button>
      </form>
    </div>
  );
}
