export function OnboardingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-6">
      <h1 className="text-3xl font-semibold">Set up your store</h1>
      <p className="text-sm opacity-70">
        Create a merchant profile linked to your account.
      </p>
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
        }}
      >
        <label className="flex flex-col gap-1 text-sm">
          Business name
          <input
            className="rounded border border-black/15 bg-white px-3 py-2"
            name="businessName"
            required
          />
        </label>
        <button
          type="submit"
          className="mt-2 rounded bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white"
        >
          Continue to dashboard
        </button>
      </form>
    </main>
  );
}
