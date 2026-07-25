import { ArrowLeft, ExternalLink, PackagePlus, QrCode, RefreshCw } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { MerchantShell } from "../components/MerchantShell";
import { Button, Field, FormAlert } from "../components/ui";
import {
  apiErrorMessage,
  parseProductForm,
} from "../lib/api-data";
import type { ProductCreated, ProductFormErrors } from "../lib/api-data";
import { trpc } from "../lib/trpc";

export function ProductNewPage() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const [created, setCreated] = useState<ProductCreated | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<ProductFormErrors>({});
  const createProduct = trpc.product.create.useMutation();
  const busy = createProduct.isPending;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const { values, errors } = parseProductForm(new FormData(event.currentTarget));
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setError("Fix the highlighted fields, then try again.");
      return;
    }

    try {
      const result = await createProduct.mutateAsync({
        name: values.name,
        priceCents: values.priceCents,
        description: values.description ?? undefined,
        imageUrl: values.imageUrl ?? undefined,
        stockCount: values.stockCount ?? undefined,
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
        action={
          <Link to="/inventory" className="button button-secondary button-sm">
            <ArrowLeft size={15} /> Inventory
          </Link>
        }
      >
        <main className="dashboard-content">
          <div className="mx-auto grid max-w-lg gap-6">
            <FormAlert tone="success" title="Product created">
              {created.name} is now in your inventory.
            </FormAlert>
            <div className="settings-card text-center">
              <span className="mx-auto grid size-14 place-items-center rounded-full bg-blue-50 text-primary">
                <QrCode />
              </span>
              <div>
                <h1 className="text-2xl font-semibold">{created.name} is ready</h1>
                <p className="mt-2 text-sm text-muted">
                  Use this QR code or share the live product page.
                </p>
              </div>
              {created.qrDataUrl ? (
                <img
                  className="mx-auto size-52"
                  src={created.qrDataUrl}
                  alt={`QR code for ${created.name}`}
                />
              ) : (
                <FormAlert tone="info" title="QR unavailable">
                  The product was created, but no QR image was returned. Open the product page or
                  manage the product to continue.
                </FormAlert>
              )}
              {created.landingPageUrl && (
                <a
                  className="button button-primary"
                  href={created.landingPageUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  View product page <ExternalLink size={16} />
                </a>
              )}
              <Link className="button button-secondary" to={`/products/${created.id}`}>
                Manage product
              </Link>
              <Link className="button button-ghost" to="/inventory">
                Return to inventory
              </Link>
            </div>
          </div>
        </main>
      </MerchantShell>
    );
  }

  return (
    <MerchantShell
      title="Inventory"
      action={
        <Link to="/inventory" className="button button-secondary button-sm">
          <ArrowLeft size={15} /> Inventory
        </Link>
      }
    >
      <main className="dashboard-content">
        <div className="mx-auto max-w-lg">
          <button
            className="mb-7 flex items-center gap-2 text-sm text-muted"
            onClick={() => navigate("/inventory")}
            type="button"
          >
            <ArrowLeft size={17} /> Back to inventory
          </button>
          <div>
            <h1 className="text-3xl font-semibold">New product</h1>
            <p className="mt-2 text-sm text-muted">
              Create a product and add it to your inventory.
            </p>
          </div>
          <form
            className="mt-7 flex flex-col gap-4"
            onSubmit={(event) => void submit(event)}
            noValidate
          >
            <fieldset className="grid gap-4 border-0 p-0" disabled={busy}>
              <Field
                label="Product name"
                name="name"
                placeholder="Executive Slim Wallet"
                required
                maxLength={120}
                error={fieldErrors.name}
                onChange={() => setFieldErrors((current) => ({ ...current, name: undefined }))}
              />
              <Field
                label="Price (AUD)"
                name="price"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="129.00"
                required
                error={fieldErrors.price}
                onChange={() => setFieldErrors((current) => ({ ...current, price: undefined }))}
              />
              <Field
                label="Stock count"
                name="stockCount"
                type="number"
                min="0"
                step="1"
                placeholder="20"
                error={fieldErrors.stockCount}
                onChange={() =>
                  setFieldErrors((current) => ({ ...current, stockCount: undefined }))
                }
              />
              <Field
                label="Image URL"
                name="imageUrl"
                type="url"
                placeholder="https://…"
                error={fieldErrors.imageUrl}
                onChange={() => setFieldErrors((current) => ({ ...current, imageUrl: undefined }))}
              />
              <label className="grid gap-1.5 text-sm font-medium text-ink">
                Description
                <textarea
                  className={`field h-auto min-h-28 py-3 ${fieldErrors.description ? "field-invalid" : ""}`}
                  name="description"
                  rows={4}
                  maxLength={2000}
                  aria-invalid={Boolean(fieldErrors.description)}
                  onChange={() =>
                    setFieldErrors((current) => ({ ...current, description: undefined }))
                  }
                />
                {fieldErrors.description && (
                  <span className="field-error" role="alert">
                    {fieldErrors.description}
                  </span>
                )}
              </label>
            </fieldset>

            {error && (
              <FormAlert tone="error" title="Could not create product">
                {error}
              </FormAlert>
            )}

            <Button type="submit" disabled={busy}>
              {busy ? (
                <>
                  <RefreshCw size={17} className="animate-spin" /> Creating product…
                </>
              ) : (
                <>
                  <PackagePlus size={17} /> Create product & add to inventory
                </>
              )}
            </Button>
            <Link className="button button-secondary" to="/inventory">
              Cancel
            </Link>
          </form>
        </div>
      </main>
    </MerchantShell>
  );
}
