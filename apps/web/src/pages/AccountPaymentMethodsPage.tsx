import { CreditCard, Trash2 } from "lucide-react";
import { useState } from "react";

import { AccountShell } from "../components/AccountShell";
import { apiErrorMessage } from "../lib/api-data";
import { trpc } from "../lib/trpc";

type SavedMethod = {
  id: string;
  merchantId: string;
  merchantName: string;
  cardScheme: string | null;
  cardLast4: string | null;
  cardExpiryMonth: number | null;
  cardExpiryYear: number | null;
  cardHolderName: string | null;
  cardSavedAt: Date | string | null;
};

function schemeLabel(scheme: string | null) {
  if (!scheme) return "Card";
  return scheme.charAt(0).toUpperCase() + scheme.slice(1);
}

function expiryLabel(month: number | null, year: number | null) {
  if (!month || !year) return null;
  return `expires ${String(month).padStart(2, "0")}/${String(year).slice(-2)}`;
}

export function AccountPaymentMethodsPage() {
  const utils = trpc.useUtils();
  const [error, setError] = useState<string | null>(null);
  const methodsQuery = trpc.account.listPaymentMethods.useQuery();
  const deleteMethod = trpc.account.deletePaymentMethod.useMutation({
    onSuccess: () => void utils.account.listPaymentMethods.invalidate(),
  });
  const methods = (methodsQuery.data ?? []) as SavedMethod[];

  async function remove(method: SavedMethod) {
    const label = `${schemeLabel(method.cardScheme)} •••• ${method.cardLast4 ?? "????"}`;
    if (!window.confirm(`Remove ${label} saved for ${method.merchantName}?`)) {
      return;
    }
    setError(null);
    try {
      await deleteMethod.mutateAsync({ id: method.id });
    } catch (caught) {
      setError(apiErrorMessage(caught, "Could not remove this card"));
    }
  }

  return (
    <AccountShell>
      <section>
        <h2 className="text-base font-semibold">Saved payment methods</h2>
        <p className="mt-1 text-xs text-muted">
          One card per store — saved when you tick “save this card” at checkout.
          Card details are stored securely by Pinch; we only keep a reference.
        </p>
      </section>

      {methodsQuery.isPending && (
        <p className="text-sm text-muted">Loading saved cards…</p>
      )}

      {methodsQuery.isError && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">
          {methodsQuery.error.message}
        </p>
      )}

      {error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      {!methodsQuery.isPending && !methodsQuery.isError && methods.length === 0 && (
        <div className="empty-state">
          <CreditCard size={22} />
          <strong>No saved cards</strong>
          <span>Tick “save this card” during payment to check out faster next time.</span>
        </div>
      )}

      <div className="saved-methods">
        {methods.map((method) => (
          <button
            key={method.id}
            type="button"
            onClick={() => void remove(method)}
            disabled={deleteMethod.isPending}
            aria-label={`Remove card ending ${method.cardLast4 ?? ""} for ${method.merchantName}`}
          >
            <span className="payment-brand brand-card">
              {schemeLabel(method.cardScheme).slice(0, 4).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1 text-left">
              <strong>
                {schemeLabel(method.cardScheme)} •••• {method.cardLast4 ?? "????"}
              </strong>
              <small>
                {method.merchantName}
                {expiryLabel(method.cardExpiryMonth, method.cardExpiryYear)
                  ? ` · ${expiryLabel(method.cardExpiryMonth, method.cardExpiryYear)}`
                  : ""}
              </small>
            </span>
            <span className="edit flex items-center gap-1">
              <Trash2 size={13} /> Remove
            </span>
          </button>
        ))}
      </div>
    </AccountShell>
  );
}
