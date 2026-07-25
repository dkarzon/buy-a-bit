export function ProductNewPage() {
  return (
    <main className="mx-auto max-w-md px-6 py-10">
      <h1 className="text-3xl font-semibold">New product</h1>
      <p className="mt-2 text-sm opacity-70">
        Calls <code>product.create</code> — Zod input in{" "}
        <code>@buy-a-bit/shared</code>.
      </p>
      <form
        className="mt-6 flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
        }}
      >
        <label className="flex flex-col gap-1 text-sm">
          Name
          <input
            className="rounded border border-black/15 bg-white px-3 py-2"
            name="name"
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Price (cents)
          <input
            className="rounded border border-black/15 bg-white px-3 py-2"
            name="priceCents"
            type="number"
            min={1}
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Description
          <textarea
            className="rounded border border-black/15 bg-white px-3 py-2"
            name="description"
            rows={3}
          />
        </label>
        <button
          type="submit"
          className="mt-2 rounded bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white"
        >
          Create &amp; get QR
        </button>
      </form>
    </main>
  );
}
