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
export type OrderListRecord = z.infer<typeof orderListItem>;
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
  return error instanceof Error && error.message ? error.message : fallback;
}
