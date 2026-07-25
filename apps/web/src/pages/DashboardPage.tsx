export function DashboardPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-3xl font-semibold">Dashboard</h1>
      <p className="mt-2 text-sm opacity-70">
        Merchant home — products and recent orders (Day 1–2).
      </p>
      <a
        className="mt-6 inline-block rounded bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white"
        href="/products/new"
      >
        New product
      </a>
    </main>
  );
}
