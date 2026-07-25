import { ArrowRight } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { Brand, Button, Field } from "../components/ui";
import { trpc } from "../lib/trpc";

export function OnboardingPage() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const [error, setError] = useState<string | null>(null);
  const createMerchant = trpc.merchant.create.useMutation();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = new FormData(event.currentTarget);
    const businessName = String(form.get("businessName") ?? "").trim();

    try {
      await createMerchant.mutateAsync({
        businessName,
        pinchConnectionMode: "managed",
      });
      await utils.merchant.me.invalidate();
      navigate("/dashboard");
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err && typeof err.message === "string"
          ? err.message
          : "Could not create store";
      setError(message);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6">
      <Brand />
      <div>
        <h1 className="text-3xl font-semibold">Set up your store</h1>
        <p className="mt-2 text-sm text-muted">
          Create a merchant profile linked to your account.
        </p>
      </div>
      <form className="flex flex-col gap-4" onSubmit={(e) => void submit(e)}>
        <Field
          label="Business name"
          name="businessName"
          placeholder="Your business"
          required
          maxLength={120}
        />

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={createMerchant.isPending}>
          {createMerchant.isPending ? "Setting up…" : "Continue to dashboard"}{" "}
          {!createMerchant.isPending && <ArrowRight size={17} />}
        </Button>
      </form>
    </main>
  );
}
