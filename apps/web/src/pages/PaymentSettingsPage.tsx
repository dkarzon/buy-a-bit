import { ArrowLeft, Check, CreditCard, Settings, ShieldCheck } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { Button, Field, MobileNav } from "../components/ui";
import { apiErrorMessage } from "../lib/api-data";
import { trpc } from "../lib/trpc";

export function PaymentSettingsPage() {
  const navigate = useNavigate();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const utils = trpc.useUtils();
  const merchantQuery = trpc.merchant.me.useQuery();
  const updateProfile = trpc.merchant.updateProfile.useMutation();
  const account = merchantQuery.data;

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      await updateProfile.mutateAsync({
        businessName: String(form.get("businessName") ?? "").trim(),
      });
      await utils.merchant.me.invalidate();
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2200);
    } catch (caught) {
      setError(apiErrorMessage(caught, "Could not update merchant profile"));
    }
  }

  if (merchantQuery.isPending) {
    return <main className="grid min-h-screen place-items-center text-sm text-muted">Loading payment settings…</main>;
  }

  if (merchantQuery.isError || !account?.merchant) {
    return (
      <main className="grid min-h-screen place-items-center px-6 text-center">
        <div className="grid gap-3">
          <h1 className="text-xl font-semibold">Could not load settings</h1>
          <p className="text-sm text-muted">{merchantQuery.error?.message ?? "Merchant profile was not found."}</p>
          <Button onClick={() => void merchantQuery.refetch()}>Try again</Button>
        </div>
      </main>
    );
  }

  return (
    <div className="settings-page">
      <header className="settings-header">
        <button onClick={() => navigate(-1)} aria-label="Back"><ArrowLeft size={19} /></button>
        <h1>Payment settings</h1>
        <button aria-label="Settings"><Settings size={18} /></button>
      </header>

      <div className="settings-main">
        <section>
          <h2 className="eyebrow">Payment connection</h2>
          <div className="saved-methods">
            <div className="flex min-h-16 items-center gap-3 rounded-lg border border-[var(--outline)] bg-white p-3">
              <span className="payment-brand brand-card"><CreditCard size={17} /></span>
              <span className="min-w-0 flex-1">
                <strong className="block text-xs font-medium">
                  {account.merchant.pinchConnectionMode === "byok" ? "Connected Pinch account" : "Managed payments"}
                </strong>
                <small className="mt-1 block text-[10px] text-muted">
                  Status: {account.merchant.pinchMerchantStatus ?? "pending setup"}
                </small>
              </span>
              <span className={`status ${account.merchant.pinchMerchantStatus === "active" ? "status-paid" : "status-pending"}`}>
                {account.merchant.pinchMerchantStatus ?? "Pending"}
              </span>
            </div>
          </div>
        </section>

        <form key={account.merchant.id} className="grid gap-4" onSubmit={(event) => void saveProfile(event)}>
          <section>
            <h2 className="eyebrow">Merchant profile</h2>
            <div className="settings-card">
              <Field label="Business name" name="businessName" defaultValue={account.merchant.businessName} required maxLength={120} />
              <Field label="Account email" type="email" value={account.user.email} readOnly disabled />
              <Field label="Store slug" value={account.merchant.storeSlug ?? "Assigned when your store goes live"} readOnly disabled />
            </div>
          </section>

          <aside className="security-note">
            <ShieldCheck size={18} />
            <p>
              <strong>Customer cards are vaulted in Pinch.</strong> Buyers save a card at checkout
              (signed in). Manage yours under{" "}
              <Link to="/account/payment-methods" className="font-semibold text-primary">
                Account → Payment methods
              </Link>
              . We only store Pinch references and display metadata — never full card numbers.
            </p>
          </aside>

          {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
          <Button type="submit" className="w-full" disabled={updateProfile.isPending}>
            {updateProfile.isPending ? "Saving…" : "Save profile changes"}
          </Button>
        </form>
      </div>

      <MobileNav />
      {saved && <div className="save-toast"><Check size={16} /> Profile saved</div>}
    </div>
  );
}
