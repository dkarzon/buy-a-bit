import { useSearchParams } from "react-router-dom";

export function PaymentCompletePage() {
  const [params] = useSearchParams();
  const session = params.get("session");

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-6">
      <h1 className="text-3xl font-semibold">Payment complete</h1>
      <p className="text-sm opacity-70">
        Session: {session ?? "(missing)"} — calls{" "}
        <code>payment.getStatus</code> (Day 2).
      </p>
    </main>
  );
}
