import { CreditCard, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { AccountShell } from "../components/AccountShell";
import { Button, Field } from "../components/ui";
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

function schemeLabel(scheme: string | null) {
  if (!scheme) return "Card";
  return scheme.charAt(0).toUpperCase() + scheme.slice(1);
}

function expiryLabel(month: number | null, year: number | null) {
  if (!month || !year) return null;
  return `expires ${String(month).padStart(2, "0")}/${String(year).slice(-2)}`;
}

function formatCardNumber(value: string) {
  return value
    .replace(/\D/g, "")
    .slice(0, 19)
    .replace(/(\d{4})(?=\d)/g, "$1 ")
    .trim();
}

export function AccountPaymentMethodsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const utils = trpc.useUtils();
  const returnTo = searchParams.get("returnTo");
  const merchantFromQuery = searchParams.get("merchantId") ?? "";

  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(Boolean(merchantFromQuery));
  const [merchantId, setMerchantId] = useState(merchantFromQuery);
  const [cardNumber, setCardNumber] = useState("");
  const [scriptReady, setScriptReady] = useState(Boolean(window.Pinch));

  const methodsQuery = trpc.account.listPaymentMethods.useQuery();
  const merchantsQuery = trpc.account.listMerchantsForCards.useQuery(undefined, {
    enabled: showAdd,
  });
  const saveContextQuery = trpc.account.getSaveCardContext.useQuery(
    { merchantId },
    { enabled: showAdd && Boolean(merchantId), retry: false },
  );
  const saveMethod = trpc.account.savePaymentMethod.useMutation();
  const deleteMethod = trpc.account.deletePaymentMethod.useMutation({
    onSuccess: () => void utils.account.listPaymentMethods.invalidate(),
  });
  const methods = (methodsQuery.data ?? []) as SavedMethod[];

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

  useEffect(() => {
    if (merchantFromQuery) {
      setMerchantId(merchantFromQuery);
      setShowAdd(true);
    }
  }, [merchantFromQuery]);

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

  async function saveCard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!merchantId) {
      setError("Choose a store to save this card for.");
      return;
    }
    if (!window.Pinch || !saveContextQuery.data) {
      setError("Secure card fields are not ready. Please try again.");
      return;
    }

    const form = new FormData(event.currentTarget);
    try {
      const capture = window.Pinch.Capture({
        publishableKey: saveContextQuery.data.publishableKey,
      });
      const { token } = await capture.createToken({
        sourceType: "credit-card",
        cardHolderName: String(form.get("cardHolderName") ?? ""),
        cardNumber: String(form.get("cardNumber") ?? "").replace(/\s/g, ""),
        expiryMonth: String(form.get("expiryMonth") ?? ""),
        expiryYear: String(form.get("expiryYear") ?? ""),
        cvc: String(form.get("cvc") ?? ""),
      });
      await saveMethod.mutateAsync({
        merchantId,
        creditCardToken: token,
      });
      await utils.account.listPaymentMethods.invalidate();
      setShowAdd(false);
      setCardNumber("");
      event.currentTarget.reset();
      if (returnTo?.startsWith("/")) {
        navigate(returnTo);
      }
    } catch (caught) {
      setError(apiErrorMessage(caught, "Could not save your card"));
    }
  }

  return (
    <AccountShell>
      <section>
        <h2 className="text-base font-semibold">Payment settings</h2>
        <p className="mt-1 text-xs text-muted">
          Save one card per store here. At checkout we only charge your saved card —
          card numbers are tokenised by Pinch and stored as a secure reference in your account.
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

      {!methodsQuery.isPending && !methodsQuery.isError && methods.length === 0 && !showAdd && (
        <div className="empty-state">
          <CreditCard size={22} />
          <strong>No saved cards</strong>
          <span>Add a card below, then use it for one-tap checkout at that store.</span>
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

        {!showAdd ? (
          <button
            type="button"
            className="add-method"
            onClick={() => {
              setError(null);
              setShowAdd(true);
            }}
          >
            <Plus size={15} /> Add credit or debit card
          </button>
        ) : (
          <form className="settings-card" onSubmit={(event) => void saveCard(event)} noValidate>
            <h3 className="text-sm font-semibold">Add card</h3>
            <label className="grid gap-1.5 text-sm font-medium text-ink">
              Store
              <select
                className="field"
                value={merchantId}
                required
                onChange={(event) => setMerchantId(event.target.value)}
                disabled={Boolean(merchantFromQuery)}
              >
                <option value="">Select a store…</option>
                {(merchantsQuery.data ?? []).map((merchant) => (
                  <option key={merchant.id} value={merchant.id}>
                    {merchant.businessName}
                  </option>
                ))}
              </select>
            </label>
            {saveContextQuery.isError && (
              <p className="text-xs text-red-700" role="alert">
                {saveContextQuery.error.message}
              </p>
            )}
            <Field label="Cardholder name" name="cardHolderName" autoComplete="cc-name" required />
            <Field
              label="Card number"
              name="cardNumber"
              inputMode="numeric"
              autoComplete="cc-number"
              placeholder="4242 4242 4242 4242"
              required
              value={cardNumber}
              onChange={(event) => setCardNumber(formatCardNumber(event.target.value))}
            />
            <div className="grid grid-cols-3 gap-2">
              <Field label="MM" name="expiryMonth" inputMode="numeric" autoComplete="cc-exp-month" placeholder="12" required />
              <Field label="YYYY" name="expiryYear" inputMode="numeric" autoComplete="cc-exp-year" placeholder="2028" required />
              <Field label="CVC" name="cvc" inputMode="numeric" autoComplete="cc-csc" placeholder="123" required />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="submit"
                className="flex-1"
                disabled={
                  !scriptReady ||
                  !merchantId ||
                  !saveContextQuery.data ||
                  saveMethod.isPending
                }
              >
                <CreditCard size={16} />{" "}
                {saveMethod.isPending
                  ? "Saving…"
                  : scriptReady
                    ? "Save card to account"
                    : "Loading secure fields…"}
              </Button>
              <button
                type="button"
                className="button button-secondary flex-1"
                onClick={() => {
                  setShowAdd(false);
                  setError(null);
                  setCardNumber("");
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </AccountShell>
  );
}
