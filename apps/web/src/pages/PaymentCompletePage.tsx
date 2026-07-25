import { Check, Download, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";
import { useSearchParams } from "react-router-dom";

import { Brand, Button, Money } from "../components/ui";
import type { PaymentStatus } from "../lib/api-data";
import { trpc } from "../lib/trpc";

export function PaymentCompletePage() {
  const [params] = useSearchParams();
  const session = params.get("session");
  const statusQuery = trpc.payment.getStatus.useQuery(
    { session: session ?? "" },
    {
      enabled: Boolean(session),
      retry: false,
      refetchInterval: (query) => {
        const current = query.state.data as PaymentStatus | undefined;
        return current?.status === "pending" ? 3000 : false;
      },
    },
  );
  const payment = statusQuery.data as PaymentStatus | undefined;

  if (!session) {
    return <main className="grid min-h-screen place-items-center text-sm text-muted">Missing payment reference.</main>;
  }

  if (statusQuery.isPending) {
    return <main className="grid min-h-screen place-items-center text-sm text-muted">Confirming payment…</main>;
  }

  if (statusQuery.isError || !payment) {
    return (
      <main className="grid min-h-screen place-items-center px-6 text-center">
        <div className="grid max-w-sm gap-3">
          <h1 className="text-xl font-semibold">Could not confirm payment</h1>
          <p className="text-sm text-muted">{statusQuery.error?.message ?? "No payment status was returned."}</p>
          <Button onClick={() => void statusQuery.refetch()}>Check again</Button>
        </div>
      </main>
    );
  }

  const isPaid = payment.status === "paid";

  return (
    <div className="complete-page">
      <header><Brand /></header>
      <main className="complete-card">
        <span className="success-mark"><Check size={32} strokeWidth={2.5} /></span>
        <div>
          <p className="eyebrow">Payment {payment.status}</p>
          <h1>{isPaid ? "Thanks for your order!" : payment.status === "pending" ? "Payment is processing" : "Payment was unsuccessful"}</h1>
          <p>
            {isPaid
              ? `Payment for ${payment.productName} was successful.`
              : payment.status === "pending"
                ? "We are waiting for final confirmation. This page updates automatically."
                : "Your card was not charged. Please return to checkout and try again."}
          </p>
        </div>
        <div className="receipt-row">
          <div className="text-left">
            <span className="block text-muted">Order reference</span>
            <strong>{payment.orderId.slice(0, 8).toUpperCase()}</strong>
          </div>
          <strong><Money cents={payment.totalCents} /></strong>
        </div>
        {isPaid && <button className="button button-secondary w-full" onClick={() => window.print()}><Download size={17} /> Print receipt</button>}
        <Link className="button button-primary w-full" to="/">
          <ShoppingBag size={17} /> Return home
        </Link>
      </main>
    </div>
  );
}
