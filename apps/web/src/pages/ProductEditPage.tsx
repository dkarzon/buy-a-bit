import { ArrowLeft, ExternalLink, Save, Trash2 } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { Button, Field } from "../components/ui";
import { apiErrorMessage } from "../lib/api-data";
import type { ProductRecord } from "../lib/api-data";
import { trpc } from "../lib/trpc";

export function ProductEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const productsQuery = trpc.product.list.useQuery();
  const updateProduct = trpc.product.update.useMutation();
  const deleteProduct = trpc.product.delete.useMutation();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const products = (productsQuery.data ?? []) as ProductRecord[];
  const product = products.find((item) => item.id === id);

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
      await utils.product.list.invalidate();
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
      navigate("/dashboard");
    } catch (caught) {
      setError(apiErrorMessage(caught, "Could not delete product"));
    }
  }

  if (productsQuery.isPending) {
    return <main className="grid min-h-screen place-items-center text-sm text-muted">Loading product…</main>;
  }

  if (productsQuery.isError) {
    return (
      <main className="grid min-h-screen place-items-center px-6 text-center">
        <div className="grid gap-3">
          <h1 className="text-xl font-semibold">Could not load product</h1>
          <p className="text-sm text-muted">{productsQuery.error.message}</p>
          <Button onClick={() => void productsQuery.refetch()}>Try again</Button>
        </div>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="grid min-h-screen place-items-center px-6 text-center">
        <div className="grid gap-3">
          <h1 className="text-xl font-semibold">Product not found</h1>
          <p className="text-sm text-muted">This product is not available in your store.</p>
          <Link className="button button-primary" to="/dashboard">Return to dashboard</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-6 py-10">
      <Link to="/dashboard" className="mb-7 flex items-center gap-2 text-sm text-muted">
        <ArrowLeft size={17} /> Back to dashboard
      </Link>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Edit product</h1>
          <p className="mt-2 text-sm text-muted">Update the live product and inventory data.</p>
        </div>
        <Link className="icon-button" to={`/p/${product.slug}`} aria-label="View product"><ExternalLink size={18} /></Link>
      </div>

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

        {message && <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700" role="status">{message}</p>}
        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}

        <Button type="submit" disabled={updateProduct.isPending}>
          <Save size={17} /> {updateProduct.isPending ? "Saving…" : "Save changes"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => void remove()} disabled={deleteProduct.isPending}>
          <Trash2 size={17} /> {deleteProduct.isPending ? "Deleting…" : "Delete product"}
        </Button>
      </form>
    </main>
  );
}
