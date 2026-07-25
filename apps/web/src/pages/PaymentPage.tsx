import { useParams } from "react-router-dom";

/**
 * Custom payment page — CaptureJS tokenises the card in-browser, then
 * payment.charge sends only creditCardToken to the API (no Payment Links).
 */
export function PaymentPage() {
  const { orderId } = useParams();

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-6">
      <p className="text-sm opacity-60">Order / {orderId}</p>
      <h1 className="text-3xl font-semibold">Pay</h1>
      <p className="text-sm opacity-70">
        Load <code>payment.getCheckoutContext</code> for amount + publishable
        key, tokenise with CaptureJS, then <code>payment.charge</code>.
      </p>
      <form
        className="mt-2 flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
        }}
      >
        <label className="flex flex-col gap-1 text-sm">
          Cardholder name
          <input
            className="rounded border border-black/15 bg-white px-3 py-2"
            name="cardHolderName"
            autoComplete="cc-name"
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Card number
          <input
            className="rounded border border-black/15 bg-white px-3 py-2"
            name="cardNumber"
            inputMode="numeric"
            autoComplete="cc-number"
            required
          />
        </label>
        <div className="grid grid-cols-3 gap-2">
          <label className="flex flex-col gap-1 text-sm">
            MM
            <input
              className="rounded border border-black/15 bg-white px-3 py-2"
              name="expiryMonth"
              inputMode="numeric"
              autoComplete="cc-exp-month"
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            YYYY
            <input
              className="rounded border border-black/15 bg-white px-3 py-2"
              name="expiryYear"
              inputMode="numeric"
              autoComplete="cc-exp-year"
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            CVC
            <input
              className="rounded border border-black/15 bg-white px-3 py-2"
              name="cvc"
              inputMode="numeric"
              autoComplete="cc-csc"
              required
            />
          </label>
        </div>
        <button
          type="submit"
          className="mt-2 rounded bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white"
        >
          Pay now
        </button>
      </form>
    </main>
  );
}
