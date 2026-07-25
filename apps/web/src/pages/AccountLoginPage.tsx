import { ArrowRight, ShoppingBag } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";

import { Brand, Button, Field } from "../components/ui";
import { authClient } from "../lib/auth-client";

/** Customer sign-in/sign-up — merchants use /login. */
export function AccountLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const returnTo =
    (location.state as { from?: string } | null)?.from ?? "/account";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    const name = String(form.get("name") ?? "").trim();

    try {
      if (mode === "register") {
        const { error: signUpError } = await authClient.signUp.email({
          email,
          password,
          name: name || email.split("@")[0] || "Customer",
        });
        if (signUpError) {
          setError(signUpError.message ?? "Could not create account");
          return;
        }
      } else {
        const { error: signInError } = await authClient.signIn.email({
          email,
          password,
        });
        if (signInError) {
          setError(signInError.message ?? "Invalid email or password");
          return;
        }
      }
      navigate(returnTo, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPending(false);
    }
  }

  if (sessionPending) {
    return <main className="grid min-h-screen place-items-center text-sm text-muted">Loading…</main>;
  }

  if (session) {
    return <Navigate to={returnTo} replace />;
  }

  return (
    <div className="auth-page">
      <header className="auth-header">
        <Brand />
        <a href="#support">Support</a>
      </header>

      <main className="auth-main">
        <section className="auth-form-panel">
          <form className="auth-card" onSubmit={submit}>
            <div className="auth-mobile-brand">
              <Brand compact />
              <strong>Buy-a-bit</strong>
              <span>Your customer account</span>
            </div>
            <div>
              <h1>{mode === "login" ? "Welcome back" : "Create your account"}</h1>
              <p>
                {mode === "login"
                  ? "Sign in to see your orders and pay faster with saved details."
                  : "Track your orders and save a card for faster checkout."}
              </p>
            </div>

            <div className="auth-tabs">
              <button
                type="button"
                className={mode === "login" ? "active" : ""}
                onClick={() => {
                  setMode("login");
                  setError(null);
                }}
              >
                Login
              </button>
              <button
                type="button"
                className={mode === "register" ? "active" : ""}
                onClick={() => {
                  setMode("register");
                  setError(null);
                }}
              >
                Register
              </button>
            </div>

            {mode === "register" && (
              <Field label="Full name" name="name" placeholder="Your name" required />
            )}
            <Field label="Email address" name="email" type="email" placeholder="name@example.com" required />
            <Field label="Password" name="password" type="password" placeholder="••••••••" required minLength={8} />

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={pending}>
              {pending
                ? mode === "login"
                  ? "Signing in…"
                  : "Creating account…"
                : mode === "login"
                  ? "Sign in"
                  : "Create account"}{" "}
              {!pending && <ArrowRight size={17} />}
            </Button>

            <p className="auth-switch">
              {mode === "login" ? "New here?" : "Already have an account?"}{" "}
              <button
                type="button"
                onClick={() => {
                  setMode(mode === "login" ? "register" : "login");
                  setError(null);
                }}
              >
                {mode === "login" ? "Sign up" : "Log in"}
              </button>
            </p>
            <p className="auth-switch">
              Selling with Buy-a-bit? <Link to="/login">Merchant sign in</Link>
            </p>
          </form>
        </section>

        <aside className="auth-visual">
          <div className="visual-glow" />
          <div className="auth-message">
            <p>
              <ShoppingBag size={15} /> Shop a-bit faster
            </p>
            <h2>
              Your orders and saved cards,
              <br />
              all in one place.
            </h2>
            <span>
              Keep track of everything you buy through Buy-a-bit stores and
              check out in seconds with a securely saved card.
            </span>
          </div>
          <ShoppingBag className="visual-icon" />
        </aside>
      </main>

      <footer className="auth-footer">
        <span>Stay a-bit</span>
        <nav>
          <a href="#privacy">Privacy Policy</a>
          <a href="#terms">Terms of Service</a>
          <a href="#security">Security</a>
        </nav>
        <span>© 2026 Buy-a-bit</span>
      </footer>
    </div>
  );
}
