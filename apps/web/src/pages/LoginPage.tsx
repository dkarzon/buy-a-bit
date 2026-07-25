export function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-6">
      <h1 className="text-3xl font-semibold">Sign in</h1>
      <p className="text-sm opacity-70">
        Email/password (Day 1) or Pinch OAuth (Day 2) via Better Auth.
      </p>
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
        }}
      >
        <label className="flex flex-col gap-1 text-sm">
          Email
          <input
            className="rounded border border-black/15 bg-white px-3 py-2"
            type="email"
            name="email"
            autoComplete="email"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Password
          <input
            className="rounded border border-black/15 bg-white px-3 py-2"
            type="password"
            name="password"
            autoComplete="current-password"
          />
        </label>
        <button
          type="submit"
          className="mt-2 rounded bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white"
        >
          Continue
        </button>
      </form>
    </main>
  );
}
