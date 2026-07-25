import {
  ArrowLeft,
  ExternalLink,
  PackageX,
  QrCode,
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { MerchantShell } from "../components/MerchantShell";
import { Button, Field, FormAlert, StatePanel } from "../components/ui";
import {
  apiErrorMessage,
  isUuid,
  parseProductForm,
} from "../lib/api-data";
import type { ProductFormErrors, ProductMerchantDetail } from "../lib/api-data";
import { trpc } from "../lib/trpc";

export function ProductEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const validId = isUuid(id);
  const productQuery = trpc.product.get.useQuery(
    { id: id! },
    {
      enabled: validId,
      retry: false,
    },
  );
  const updateProduct = trpc.product.update.useMutation();
  const deleteProduct = trpc.product.delete.useMutation();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<ProductFormErrors>({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const product = productQuery.data as ProductMerchantDetail | null | undefined;
  const saving = updateProduct.isPending;
  const deleting = deleteProduct.isPending;
  const busy = saving || deleting;

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!product) return;
    setError(null);
    setDeleteError(null);
    setMessage(null);

    const { values, errors } = parseProductForm(new FormData(event.currentTarget), {
      requireStock: true,
    });
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setError("Fix the highlighted fields, then try again.");
      return;
    }

    try {
      await updateProduct.mutateAsync({
        id: product.id,
        name: values.name,
        priceCents: values.priceCents,
        stockCount: values.stockCount,
        imageUrl: values.imageUrl,
        description: values.description,
        isAvailable: values.isAvailable,
      });
      await Promise.all([
        utils.product.get.invalidate({ id: product.id }),
        utils.product.list.invalidate(),
      ]);
      setMessage("Product changes saved and inventory refreshed.");
    } catch (caught) {
      setError(apiErrorMessage(caught, "Could not update product"));
    }
  }

  async function remove() {
    if (!product) return;
    setError(null);
    setDeleteError(null);
    try {
      await deleteProduct.mutateAsync({ id: product.id });
      await Promise.all([
        utils.product.list.invalidate(),
        utils.product.get.invalidate({ id: product.id }),
      ]);
      navigate("/inventory", { replace: true });
    } catch (caught) {
      setConfirmDelete(false);
      setDeleteError(apiErrorMessage(caught, "Could not delete product"));
    }
  }

  if (!validId) {
    return (
      <MerchantShell title="Inventory">
        <main className="dashboard-content">
          <StatePanel
            icon={<PackageX size={30} />}
            title="Invalid product link"
            actions={
              <>
                <Link className="button button-primary button-sm" to="/inventory">
                  Return to inventory
                </Link>
                <Link className="button button-secondary button-sm" to="/products/new">
                  Create product
                </Link>
              </>
            }
          >
            This URL does not point to a valid product. Open a product from inventory instead.
          </StatePanel>
        </main>
      </MerchantShell>
    );
  }

  if (productQuery.isPending) {
    return (
      <MerchantShell title="Inventory">
        <main className="dashboard-content">
          <div className="product-loading">
            <RefreshCw className="animate-spin" size={22} />
            <p>Loading product from inventory…</p>
          </div>
        </main>
      </MerchantShell>
    );
  }

  if (productQuery.isError) {
    return (
      <MerchantShell title="Inventory">
        <main className="dashboard-content">
          <StatePanel
            icon={<PackageX size={30} />}
            title="Could not load product"
            actions={
              <>
                <Button onClick={() => void productQuery.refetch()}>
                  <RefreshCw size={16} /> Try again
                </Button>
                <Link className="button button-secondary" to="/inventory">
                  Return to inventory
                </Link>
              </>
            }
          >
            {apiErrorMessage(productQuery.error, "The product could not be loaded.")}
          </StatePanel>
        </main>
      </MerchantShell>
    );
  }

  if (!product) {
    return (
      <MerchantShell title="Inventory">
        <main className="dashboard-content">
          <StatePanel
            icon={<PackageX size={30} />}
            title="Product not found"
            actions={
              <>
                <Link className="button button-primary" to="/inventory">
                  Return to inventory
                </Link>
                <Link className="button button-secondary" to="/products/new">
                  Create product
                </Link>
              </>
            }
          >
            This product is missing from your inventory. It may have been removed or never created.
          </StatePanel>
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
          <Link to="/inventory" className="mb-7 flex items-center gap-2 text-sm text-muted">
            <ArrowLeft size={17} /> Back to inventory
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold">Edit product</h1>
              <p className="mt-2 text-sm text-muted">
                Update the product shown in your inventory.
              </p>
            </div>
            <Link
              className="icon-button"
              to={`/p/${product.slug}`}
              aria-label="View product"
            >
              <ExternalLink size={18} />
            </Link>
          </div>

          <section className="settings-card mt-7 text-center">
            <span className="mx-auto grid size-12 place-items-center rounded-full bg-blue-50 text-primary">
              <QrCode size={22} />
            </span>
            <div>
              <h2 className="text-lg font-semibold">Product QR code</h2>
              <p className="mt-1 text-sm text-muted">
                Customers scan this to open the live product page.
              </p>
            </div>
            {product.qrDataUrl ? (
              <img
                className="mx-auto size-52"
                src={product.qrDataUrl}
                alt={`QR code for ${product.name}`}
              />
            ) : (
              <FormAlert tone="info" title="QR unavailable">
                No QR image was returned for this product. You can still edit inventory details.
              </FormAlert>
            )}
            {product.landingPageUrl && (
              <a
                className="button button-secondary"
                href={product.landingPageUrl}
                target="_blank"
                rel="noreferrer"
              >
                View product page <ExternalLink size={16} />
              </a>
            )}
          </section>

          <form
            key={product.id}
            className="mt-7 flex flex-col gap-4"
            onSubmit={(event) => void save(event)}
            noValidate
          >
            <fieldset className="grid gap-4 border-0 p-0" disabled={busy}>
              <Field
                label="Product name"
                name="name"
                defaultValue={product.name}
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
                defaultValue={(product.priceCents / 100).toFixed(2)}
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
                defaultValue={product.stockCount ?? 0}
                required
                error={fieldErrors.stockCount}
                onChange={() =>
                  setFieldErrors((current) => ({ ...current, stockCount: undefined }))
                }
              />
              <Field
                label="Image URL"
                name="imageUrl"
                type="url"
                defaultValue={product.imageUrl ?? ""}
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
                  defaultValue={product.description ?? ""}
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
              <label className="flex items-center gap-3 rounded-lg border border-[var(--outline)] bg-white p-3 text-sm">
                <input
                  name="isAvailable"
                  type="checkbox"
                  defaultChecked={product.isAvailable}
                />
                Available for purchase
              </label>
            </fieldset>

            {message && (
              <FormAlert tone="success" title="Saved">
                {message}
              </FormAlert>
            )}
            {error && (
              <FormAlert tone="error" title="Could not save changes">
                {error}
              </FormAlert>
            )}
            {deleteError && (
              <FormAlert tone="error" title="Could not delete product">
                {deleteError}
              </FormAlert>
            )}

            <Button type="submit" disabled={busy}>
              {saving ? (
                <>
                  <RefreshCw size={17} className="animate-spin" /> Saving…
                </>
              ) : (
                <>
                  <Save size={17} /> Save inventory changes
                </>
              )}
            </Button>
            <Link className="button button-secondary" to="/inventory">
              Cancel and return to inventory
            </Link>

            {!confirmDelete ? (
              <Button
                type="button"
                variant="secondary"
                className="button-danger"
                onClick={() => {
                  setDeleteError(null);
                  setConfirmDelete(true);
                }}
                disabled={busy}
              >
                <Trash2 size={17} /> Delete product
              </Button>
            ) : (
              <div className="delete-confirm">
                <FormAlert tone="error" title={`Delete ${product.name}?`}>
                  This cannot be undone. If delete is not implemented on the server yet, the product
                  will remain in inventory.
                </FormAlert>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    className="button-danger"
                    onClick={() => void remove()}
                    disabled={busy}
                  >
                    {deleting ? (
                      <>
                        <RefreshCw size={17} className="animate-spin" /> Deleting…
                      </>
                    ) : (
                      <>
                        <Trash2 size={17} /> Confirm delete
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setConfirmDelete(false)}
                    disabled={deleting}
                  >
                    Keep product
                  </Button>
                </div>
              </div>
            )}
          </form>
        </div>
      </main>
    </MerchantShell>
  );
}
