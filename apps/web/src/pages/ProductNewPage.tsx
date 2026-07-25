import { ArrowLeft, ExternalLink, PackagePlus, QrCode } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { MerchantShell } from "../components/MerchantShell";
import { Button, Field } from "../components/ui";
import { apiErrorMessage } from "../lib/api-data";
import type { ProductCreated } from "../lib/api-data";
import { trpc } from "../lib/trpc";

export function ProductNewPage() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const [created, setCreated] = useState<ProductCreated | null>(null);
  const [error, setError] = useState<string | null>(null);
  const createProduct = trpc.product.create.useMutation();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    const description = String(form.get("description") ?? "").trim();
    const imageUrl = String(form.get("imageUrl") ?? "").trim();
    const stockValue = String(form.get("stockCount") ?? "").trim();

    try {
      const result = await createProduct.mutateAsync({
        name: String(form.get("name") ?? "").trim(),
        priceCents: Math.round(Number(form.get("price")) * 100),
        description: description || undefined,
        imageUrl: imageUrl || undefined,
        stockCount: stockValue ? Number(stockValue) : undefined,
      });
      setCreated(result as ProductCreated);
      await utils.product.list.invalidate();
    } catch (caught) {
      setError(apiErrorMessage(caught, "Could not create product"));
    }
  }

  if (created) {
    return (
      <MerchantShell
        title="Inventory"
        action={<Link to="/inventory" className="button button-secondary button-sm"><ArrowLeft size={15} /> Inventory</Link>}
      >
        <main className="dashboard-content">
          <div className="mx-auto grid max-w-lg gap-6">
            <div className="settings-card text-center">
              <span className="mx-auto grid size-14 place-items-center rounded-full bg-blue-50 text-primary"><QrCode /></span>
              <div>
                <h1 className="text-2xl font-semibold">{created.name} is ready</h1>
                <p className="mt-2 text-sm text-muted">It now appears in Inventory. Use this QR code or share the live product page.</p>
              </div>
              <img className="mx-auto size-52" src={created.qrDataUrl} alt={`QR code for ${created.name}`} />
              <a className="button button-primary" href={created.landingPageUrl} target="_blank" rel="noreferrer">
                View product page <ExternalLink size={16} />
              </a>
              <Link className="button button-secondary" to={`/products/${created.id}`}>Manage product</Link>
              <Link className="button button-ghost" to="/inventory">Return to inventory</Link>
            </div>
          </div>
        </main>
      </MerchantShell>
    );
  }

  return (
    <MerchantShell
      title="Inventory"
      action={<Link to="/inventory" className="button button-secondary button-sm"><ArrowLeft size={15} /> Inventory</Link>}
    >
      <main className="dashboard-content">
        <div className="mx-auto max-w-lg">
          <button className="mb-7 flex items-center gap-2 text-sm text-muted" onClick={() => navigate("/inventory")}>
            <ArrowLeft size={17} /> Back to inventory
          </button>
          <div>
            <h1 className="text-3xl font-semibold">New product</h1>
            <p className="mt-2 text-sm text-muted">Create a product and add it to your inventory.</p>
          </div>
          <form className="mt-7 flex flex-col gap-4" onSubmit={(event) => void submit(event)}>
            <Field label="Product name" name="name" placeholder="Executive Slim Wallet" required maxLength={120} />
            <Field label="Price (AUD)" name="price" type="number" min="0.01" step="0.01" placeholder="129.00" required />
            <Field label="Stock count" name="stockCount" type="number" min="0" step="1" placeholder="20" />
            <Field label="Image URL" name="imageUrl" type="url" placeholder="https://…" />
            <label className="flex flex-col gap-1 text-sm">
              Description
              <textarea
                className="field h-auto min-h-28 py-3"
                name="description"
                rows={4}
                maxLength={2000}
              />
            </label>
            {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
            <Button type="submit" disabled={createProduct.isPending}>
              <PackagePlus size={17} /> {createProduct.isPending ? "Creating product…" : "Create product & add to inventory"}
            </Button>
          </form>
        </div>
      </main>
    </MerchantShell>
  );
}
