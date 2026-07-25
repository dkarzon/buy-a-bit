import {
  orderListItem,
  paymentGetCheckoutContextOutput,
  paymentGetStatusOutput,
  productCreateOutput,
  productMerchantDetailOutput,
  productPublicOutput,
} from "@buy-a-bit/shared";
import type { z } from "zod";

export type ProductPublic = z.infer<typeof productPublicOutput>;
export type ProductCreated = z.infer<typeof productCreateOutput>;
export type ProductMerchantDetail = z.infer<typeof productMerchantDetailOutput>;
export type OrderListRecord = Omit<
  z.infer<typeof orderListItem>,
  "createdAt" | "paidAt"
> & {
  createdAt: Date | string;
  paidAt: Date | string | null;
};
export type PaymentCheckoutContext = z.infer<typeof paymentGetCheckoutContextOutput>;
export type PaymentStatus = z.infer<typeof paymentGetStatusOutput>;

export type ProductRecord = {
  id: string;
  merchantId: string;
  slug: string;
  name: string;
  priceCents: number;
  description: string | null;
  imageUrl: string | null;
  stockCount: number | null;
  isAvailable: boolean;
  sortOrder: number;
  createdAt: Date | string;
};

export const productPlaceholder =
  "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=85";

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "—";
}

export function relativeTime(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  const difference = Date.now() - date.getTime();
  if (!Number.isFinite(difference) || difference < 0) return "just now";
  const minutes = Math.floor(difference / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function apiErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === "object") {
    const record = error as {
      message?: unknown;
      data?: { code?: unknown; message?: unknown };
      shape?: { message?: unknown };
    };
    const code = typeof record.data?.code === "string" ? record.data.code : null;
    const message =
      (typeof record.message === "string" && record.message) ||
      (typeof record.data?.message === "string" && record.data.message) ||
      (typeof record.shape?.message === "string" && record.shape.message) ||
      null;

    if (code === "NOT_IMPLEMENTED" || message === "Not implemented") {
      return "This action is not available on the server yet.";
    }
    if (code === "UNAUTHORIZED") {
      return "Your session expired. Please sign in again.";
    }
    if (code === "FORBIDDEN") {
      return message ?? "You do not have permission to do that.";
    }
    if (code === "NOT_FOUND") {
      return message ?? "That product could not be found.";
    }
    if (code === "BAD_REQUEST" || code === "PARSE_ERROR") {
      return message ?? "Please check the form and try again.";
    }
    if (message) return message;
  }

  return error instanceof Error && error.message ? error.message : fallback;
}

export function isUuid(value: string | undefined | null): value is string {
  return Boolean(
    value &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value,
      ),
  );
}

export type ProductFormValues = {
  name: string;
  priceCents: number;
  stockCount: number | null;
  imageUrl: string | null;
  description: string | null;
  isAvailable: boolean;
};

export type ProductFormErrors = Partial<
  Record<"name" | "price" | "stockCount" | "imageUrl" | "description", string>
>;

export function parseProductForm(
  form: FormData,
  options?: { requireStock?: boolean },
): { values: ProductFormValues; errors: ProductFormErrors } {
  const name = String(form.get("name") ?? "").trim();
  const priceRaw = String(form.get("price") ?? "").trim();
  const stockRaw = String(form.get("stockCount") ?? "").trim();
  const imageUrl = String(form.get("imageUrl") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  const errors: ProductFormErrors = {};

  if (!name) errors.name = "Product name is required.";
  else if (name.length > 120) errors.name = "Product name must be 120 characters or fewer.";

  const price = Number(priceRaw);
  if (!priceRaw || !Number.isFinite(price) || price <= 0) {
    errors.price = "Enter a price greater than $0.00.";
  }

  let stockCount: number | null = null;
  if (stockRaw) {
    const stock = Number(stockRaw);
    if (!Number.isInteger(stock) || stock < 0) {
      errors.stockCount = "Stock must be a whole number of 0 or more.";
    } else {
      stockCount = stock;
    }
  } else if (options?.requireStock) {
    errors.stockCount = "Stock count is required.";
  }

  if (imageUrl) {
    try {
      const parsed = new URL(imageUrl);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        errors.imageUrl = "Image URL must start with http:// or https://.";
      }
    } catch {
      errors.imageUrl = "Enter a valid image URL.";
    }
  }

  if (description.length > 2000) {
    errors.description = "Description must be 2000 characters or fewer.";
  }

  return {
    values: {
      name,
      priceCents: Number.isFinite(price) ? Math.round(price * 100) : 0,
      stockCount,
      imageUrl: imageUrl || null,
      description: description || null,
      isAvailable: form.get("isAvailable") === "on",
    },
    errors,
  };
}
