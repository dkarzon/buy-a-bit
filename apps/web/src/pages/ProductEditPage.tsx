import { ArrowLeft, ExternalLink, QrCode, Save, Trash2 } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { MerchantShell } from "../components/MerchantShell";
import { Button, Field } from "../components/ui";
import { apiErrorMessage } from "../lib/api-data";
import type { ProductMerchantDetail } from "../lib/api-data";
import { trpc } from "../lib/trpc";

export function ProductEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const productQuery = trpc.product.get.useQuery(
    { id: id! },
    { enabled: Boolean(id) },
  );
  const updateProduct = trpc.product.update.useMutation();
  const deleteProduct = trpc.product.delete.useMutation();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const product = productQuery.data as ProductMerchantDetail | null | undefined;

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!product) return;
    setError(null);
    setMessage(null);
    const form = new FormData(event.currentTarget);
    const imageUrl = String(form.get("imageUrl") ?? "").trim();
    const description = String(form.get("description") ?? "").trim();

    try {
      await updateProduct.mutateAsync({
        id: product.id,
        name: String(form.get("name") ?? "").trim(),
        priceCents: Math.round(Number(form.get("price")) * 100),
        stockCount: Number(form.get("stockCount")),
        imageUrl: imageUrl || null,
        description: description || null,
        isAvailable: form.get("isAvailable") === "on",
      });
      await Promise.all([
        utils.product.get.invalidate({ id: product.id }),
        utils.product.list.invalidate(),
      ]);
      setMessage("Product changes saved.");
    } catch (caught) {
      setError(apiErrorMessage(caught, "Could not update product"));
    }
  }

  async function remove() {
    if (!product || !window.confirm(`Delete ${product.name}? This cannot be undone.`)) return;
    setError(null);
    try {
      await deleteProduct.mutateAsync({ id: product.id });
      await utils.product.list.invalidate();
      navigate("/inventory");
    } catch (caught) {
      setError(apiErrorMessage(caught, "Could not delete product"));
    }
  }

  if (productQuery.isPending) {
    return (
      <MerchantShell title="Inventory">
        <main className="grid min-h-[70vh] place-items-center text-sm text-muted">Loading product from inventory…</main>
      </MerchantShell>
    );
  }

  if (productQuery.isError) {
    return (
      <MerchantShell title="Inventory">
        <main className="grid min-h-[70vh] place-items-center px-6 text-center">
          <div className="grid gap-3">
            <h1 className="text-xl font-semibold">Could not load product</h1>
            <p className="text-sm text-muted">{productQuery.error.message}</p>
            <Button onClick={() => void productQuery.refetch()}>Try again</Button>
            <Link className="button button-secondary" to="/inventory">Return to inventory</Link>
          </div>
        </main>
      </MerchantShell>
    );
  }

  if (!product) {
    return (
      <MerchantShell title="Inventory">
        <main className="grid min-h-[70vh] place-items-center px-6 text-center">
          <div className="grid gap-3">
            <h1 className="text-xl font-semibold">Product not found</h1>
            <p className="text-sm text-muted">This product is not available in your inventory.</p>
            <Link className="button button-primary" to="/inventory">Return to inventory</Link>
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
          <Link to="/inventory" className="mb-7 flex items-center gap-2 text-sm text-muted">
            <ArrowLeft size={17} /> Back to inventory
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold">Edit product</h1>
              <p className="mt-2 text-sm text-muted">Update the product shown in your inventory.</p>
            </div>
            <Link className="icon-button" to={`/p/${product.slug}`} aria-label="View product"><ExternalLink size={18} /></Link>
          </div>

          <section className="settings-card mt-7 text-center">
            <span className="mx-auto grid size-12 place-items-center rounded-full bg-blue-50 text-primary"><QrCode size={22} /></span>
            <div>
              <h2 className="text-lg font-semibold">Product QR code</h2>
              <p className="mt-1 text-sm text-muted">Customers scan this to open the live product page.</p>
            </div>
            <img className="mx-auto size-52" src={product.qrDataUrl} alt={`QR code for ${product.name}`} />
            <a className="button button-secondary" href={product.landingPageUrl} target="_blank" rel="noreferrer">
              View product page <ExternalLink size={16} />
            </a>
          </section>

          <form key={product.id} className="mt-7 flex flex-col gap-4" onSubmit={(event) => void save(event)}>
            <Field label="Product name" name="name" defaultValue={product.name} required maxLength={120} />
            <Field label="Price (AUD)" name="price" type="number" min="0.01" step="0.01" defaultValue={(product.priceCents / 100).toFixed(2)} required />
            <Field label="Stock count" name="stockCount" type="number" min="0" step="1" defaultValue={product.stockCount ?? 0} />
            <Field label="Image URL" name="imageUrl" type="url" defaultValue={product.imageUrl ?? ""} />
            <label className="flex flex-col gap-1 text-sm">
              Description
              <textarea className="field h-auto min-h-28 py-3" name="description" rows={4} maxLength={2000} defaultValue={product.description ?? ""} />
            </label>
            <label className="flex items-center gap-3 rounded-lg border border-[var(--outline)] bg-white p-3 text-sm">
              <input name="isAvailable" type="checkbox" defaultChecked={product.isAvailable} />
              Available for purchase
            </label>

            {message && <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700" role="status">{message} The inventory cache has been refreshed.</p>}
            {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}

            <Button type="submit" disabled={updateProduct.isPending}>
              <Save size={17} /> {updateProduct.isPending ? "Saving…" : "Save inventory changes"}
            </Button>
            <Link className="button button-secondary" to="/inventory">Cancel and return to inventory</Link>
            <Button type="button" variant="secondary" onClick={() => void remove()} disabled={deleteProduct.isPending}>
              <Trash2 size={17} /> {deleteProduct.isPending ? "Deleting…" : "Delete product"}
            </Button>
          </form>
        </div>
      </main>
    </MerchantShell>
  );
}
