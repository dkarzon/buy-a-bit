import { useParams } from "react-router-dom";

export function ProductLandingPage() {
  const { slug } = useParams();

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-6">
      <p className="text-sm opacity-60">Product / {slug}</p>
      <h1 className="text-3xl font-semibold">Product landing</h1>
      <p className="text-sm opacity-70">
        Public page from <code>product.getBySlug</code> — contact form →{" "}
        <code>order.create</code> → navigate to <code>/pay/:orderId</code>.
      </p>
      <form
        className="mt-2 flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
        }}
      >
        <label className="flex flex-col gap-1 text-sm">
          Name
          <input
            className="rounded border border-black/15 bg-white px-3 py-2"
            name="customerName"
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Email
          <input
            className="rounded border border-black/15 bg-white px-3 py-2"
            name="customerEmail"
            type="email"
            required
          />
        </label>
        <button
          type="submit"
          className="mt-2 rounded bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white"
        >
          Continue to Payment
        </button>
      </form>
    </main>
  );
}
