import { Check, Download, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";
import { useSearchParams } from "react-router-dom";

import { Brand } from "../components/ui";

export function PaymentCompletePage() {
  const [params] = useSearchParams();
  const session = params.get("session");

  return (
    <div className="complete-page">
      <header><Brand /></header>
      <main className="complete-card">
        <span className="success-mark"><Check size={32} strokeWidth={2.5} /></span>
        <div>
          <p className="eyebrow">Payment confirmed</p>
          <h1>Thanks for your order!</h1>
          <p>Your payment was successful. A receipt has been sent to your email address.</p>
        </div>
        <div className="receipt-row">
          <span>Order reference</span>
          <strong>{session?.replace("mock_", "BAB-") ?? "BAB-DEMO"}</strong>
        </div>
        <button className="button button-secondary w-full"><Download size={17} /> Download receipt</button>
        <Link className="button button-primary w-full" to="/p/executive-slim-wallet">
          <ShoppingBag size={17} /> Continue shopping
        </Link>
      </main>
    </div>
  );
}
