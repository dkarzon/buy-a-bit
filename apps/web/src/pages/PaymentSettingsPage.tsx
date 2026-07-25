import { ArrowLeft, Check, CreditCard, Plus, Settings, ShieldCheck } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { Button, Field, MobileNav } from "../components/ui";
import { paymentMethods } from "../lib/mock-data";

export function PaymentSettingsPage() {
  const navigate = useNavigate();
  const [defaultMethod, setDefaultMethod] = useState("apple");
  const [saved, setSaved] = useState(false);

  function save(event: FormEvent) {
    event.preventDefault();
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  }

  return (
    <div className="settings-page">
      <header className="settings-header">
        <button onClick={() => navigate(-1)} aria-label="Back"><ArrowLeft size={19} /></button>
        <h1>Payment settings</h1>
        <button aria-label="Settings"><Settings size={18} /></button>
      </header>

      <form className="settings-main" onSubmit={save}>
        <section>
          <h2 className="eyebrow">Saved payment methods</h2>
          <div className="saved-methods">
            {paymentMethods.map((method) => (
              <button
                key={method.id}
                type="button"
                className={defaultMethod === method.id ? "selected" : ""}
                onClick={() => setDefaultMethod(method.id)}
              >
                <span className={`payment-brand brand-${method.id}`}>
                  {method.id === "card" ? <CreditCard size={17} /> : method.brand[0]}
                </span>
                <span className="min-w-0 flex-1 text-left">
                  <strong>{method.detail}</strong>
                  <small>{method.subline}</small>
                </span>
                {defaultMethod === method.id ? <i><Check size={12} /></i> : <span className="edit">Edit</span>}
              </button>
            ))}
            <button type="button" className="add-method"><Plus size={16} /> Add new payment method</button>
          </div>
        </section>

        <section>
          <h2 className="eyebrow">Billing details</h2>
          <div className="settings-card">
            <Field label="Full name" defaultValue="Alex Merchant" />
            <Field label="Email address" type="email" defaultValue="alex.merchant@buyabit.com" />
          </div>
        </section>

        <aside className="security-note">
          <ShieldCheck size={18} />
          <p><strong>Your payment information is encrypted and stored securely.</strong> Buy-a-bit never stores your full card number on our servers.</p>
        </aside>

        <Button type="submit" className="w-full">Save changes</Button>
      </form>

      <MobileNav />
      {saved && <div className="save-toast"><Check size={16} /> Payment settings saved</div>}
    </div>
  );
}
