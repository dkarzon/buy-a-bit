import { Check, CreditCard, LockKeyhole, ShieldCheck } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";

import { Brand, Button, Money } from "../components/ui";
import { authClient } from "../lib/auth-client";
import { apiErrorMessage } from "../lib/api-data";
import type { PaymentCheckoutContext } from "../lib/api-data";
import { trpc } from "../lib/trpc";

function schemeLabel(scheme: string | null) {
  if (!scheme) return "Card";
  return scheme.charAt(0).toUpperCase() + scheme.slice(1);
}

/**
 * Secure payment — charges the customer's saved card for this store only.
 * Card numbers are entered under Account → Payment settings, never here.
 */
export function PaymentPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: session } = authClient.useSession();
  const [error, setError] = useState<string | null>(null);
  const checkoutQuery = trpc.payment.getCheckoutContext.useQuery(
    { orderId: orderId ?? "" },
    { enabled: Boolean(orderId), retry: false },
  );
  const charge = trpc.payment.charge.useMutation();
  const checkout = checkoutQuery.data as PaymentCheckoutContext | undefined;
  const savedCard = checkout?.savedCard ?? null;
  const signedIn = Boolean(session?.user);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!checkout || !orderId) {
      setError("Payment is not ready. Please try again.");
      return;
    }
    if (!signedIn) {
      setError("Sign in and save a card in Payment settings to pay.");
      return;
    }
    if (!savedCard) {
      setError("Add a saved card for this store in Payment settings first.");
      return;
    }

    setError(null);
    try {
      const result = (await charge.mutateAsync({
        orderId,
        useSavedCard: true,
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

  const paymentSettingsPath = `/account/payment-methods?merchantId=${checkout.merchantId}&returnTo=${encodeURIComponent(location.pathname)}`;

  return (
    <div className="checkout-page">
      <header className="checkout-header"><Brand compact /></header>
      <form className="checkout-main" onSubmit={(event) => void submit(event)}>
        <div>
          <p className="eyebrow">Secure payment</p>
          <h1 className="mt-2 text-2xl font-semibold">{checkout.productName}</h1>
          <p className="mt-1 text-sm text-muted">
            {checkout.merchantName} · Order for {checkout.customerName}
          </p>
        </div>
        <section className="summary-card">
          <div className="summary-total border-0 pt-0">
            <span>Total amount</span>
            <strong><Money cents={checkout.totalCents} /></strong>
          </div>
        </section>

        <section className="checkout-section">
          <h2 className="flex items-center gap-2"><CreditCard size={18} /> Payment method</h2>

          {!signedIn && (
            <div className="settings-card">
              <p className="text-sm text-muted">
                Sign in, save a card in Payment settings, then return here to pay.
              </p>
              <Link
                className="button button-primary"
                to="/account/login"
                state={{ from: location.pathname }}
              >
                Sign in
              </Link>
            </div>
          )}

          {signedIn && savedCard && (
            <div className="saved-methods">
              <button type="button" className="selected">
                <span className="payment-brand brand-card">
                  {schemeLabel(savedCard.cardScheme).slice(0, 4).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1 text-left">
                  <strong>
                    {schemeLabel(savedCard.cardScheme)} •••• {savedCard.cardLast4 ?? "????"}
                  </strong>
                  <small>
                    Saved for {checkout.merchantName}
                    {savedCard.cardExpiryMonth && savedCard.cardExpiryYear
                      ? ` · expires ${String(savedCard.cardExpiryMonth).padStart(2, "0")}/${String(savedCard.cardExpiryYear).slice(-2)}`
                      : ""}
                  </small>
                </span>
                <i><Check size={12} /></i>
              </button>
              <Link className="add-method" to={paymentSettingsPath}>
                Change card in Payment settings
              </Link>
            </div>
          )}

          {signedIn && !savedCard && (
            <div className="settings-card">
              <p className="text-sm text-muted">
                No saved card for {checkout.merchantName} yet. Add one in Payment settings,
                then come back to complete this order.
              </p>
              <Link className="button button-primary" to={paymentSettingsPath}>
                Add card in Payment settings
              </Link>
            </div>
          )}
        </section>

        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
        <div className="checkout-trust">
          <LockKeyhole size={14} /> Paying with your vaulted card — no card details on this page
        </div>
        <Button type="submit" disabled={!signedIn || !savedCard || charge.isPending}>
          <ShieldCheck size={18} />{" "}
          {charge.isPending
            ? "Processing payment…"
            : !signedIn
              ? "Sign in to pay"
              : !savedCard
                ? "Add a card to pay"
                : "Pay with saved card"}
        </Button>
      </form>
    </div>
  );
}
