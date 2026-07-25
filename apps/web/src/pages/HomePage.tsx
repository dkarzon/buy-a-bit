export function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 px-6">
      <p className="text-sm uppercase tracking-widest text-[var(--color-accent)]">
        Pinch
      </p>
      <h1 className="text-4xl font-semibold tracking-tight">Buy-a-bit</h1>
      <p className="text-base opacity-80">
        NFC-triggered instant checkout for real-world products. Scaffold ready —
        Day 1 starts here.
      </p>
      <div className="flex flex-wrap gap-3 pt-2">
        <a
          className="rounded bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white"
          href="/login"
        >
          Merchant login
        </a>
        <a
          className="rounded border border-black/15 px-4 py-2 text-sm font-medium"
          href="/dashboard"
        >
          Dashboard
        </a>
      </div>
    </main>
  );
}
