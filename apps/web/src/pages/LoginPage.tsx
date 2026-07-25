import { Apple, ArrowRight, CreditCard, ShieldCheck, Sparkles } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { Brand, Button, Field } from "../components/ui";
import { authClient } from "../lib/auth-client";

export function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    const businessName = String(form.get("business") ?? "").trim();

    try {
      if (mode === "register") {
        const { error: signUpError } = await authClient.signUp.email({
          email,
          password,
          name: businessName || email.split("@")[0] || "Merchant",
        });
        if (signUpError) {
          setError(signUpError.message ?? "Could not create account");
          return;
        }
        navigate("/onboarding");
        return;
      }

      const { error: signInError } = await authClient.signIn.email({
        email,
        password,
      });
      if (signInError) {
        setError(signInError.message ?? "Invalid email or password");
        return;
      }
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPending(false);
    }
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
              <span>Secure merchant gateway</span>
            </div>
            <div>
              <h1>{mode === "login" ? "Welcome back" : "Create your account"}</h1>
              <p>
                {mode === "login"
                  ? "Please enter your credentials to access your merchant dashboard."
                  : "Start accepting secure payments in minutes."}
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
              <Field label="Business name" name="business" placeholder="Your business" required />
            )}
            <Field label="Email address" name="email" type="email" placeholder="name@company.com" required />
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
                  ? "Log in to dashboard"
                  : "Create account"}{" "}
              {!pending && <ArrowRight size={17} />}
            </Button>

            <div className="or-divider">
              <span>or continue with</span>
            </div>
            <div className="social-buttons">
              <button type="button" disabled title="Coming soon">
                <span className="google-g">G</span> Google
              </button>
              <button type="button" disabled title="Coming soon">
                <Apple size={17} /> Apple
              </button>
            </div>
            <p className="auth-switch">
              {mode === "login" ? "New to Buy-a-bit?" : "Already have an account?"}{" "}
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
          </form>
        </section>

        <aside className="auth-visual">
          <div className="visual-glow" />
          <div className="floating-card">
            <span className="grid size-10 place-items-center rounded-full bg-white/15">
              <Sparkles size={18} />
            </span>
            <div className="text-right">
              <strong>$15,420.00</strong>
              <span>Monthly revenue</span>
            </div>
          </div>
          <div className="auth-message">
            <p>
              <ShieldCheck size={15} /> Secure by design
            </p>
            <h2>
              Empowering your business,
              <br />
              one bit at a time.
            </h2>
            <span>
              Seamless QR and NFC payments designed for the modern economy. Secure, fast, and
              remarkably simple.
            </span>
          </div>
          <CreditCard className="visual-icon" />
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
      <Link to="/dashboard" className="sr-only">
        Demo dashboard
      </Link>
    </div>
  );
}
