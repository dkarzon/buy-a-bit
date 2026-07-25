import { z } from "zod";

/** Order payment lifecycle — matches DB enum and webhook mapping */
export const orderStatusSchema = z.enum(["pending", "paid", "failed"]);
export type OrderStatus = z.infer<typeof orderStatusSchema>;

export const pinchConnectionModeSchema = z.enum(["managed", "byok"]);
export type PinchConnectionMode = z.infer<typeof pinchConnectionModeSchema>;

export const pinchComplianceStatusSchema = z.enum([
  "pending",
  "in_review",
  "approved",
  "rejected",
]);
export type PinchComplianceStatus = z.infer<typeof pinchComplianceStatusSchema>;

/** http(s) image URLs or compressed client-uploaded data URLs */
export const productImageUrlSchema = z
  .string()
  .refine(
    (value) => {
      if (value.startsWith("data:image/") && value.includes(";base64,")) {
        return value.length <= 1_500_000;
      }
      try {
        const parsed = new URL(value);
        return parsed.protocol === "http:" || parsed.protocol === "https:";
      } catch {
        return false;
      }
    },
    { message: "Must be an http(s) image URL or uploaded product photo" },
  );
export type ProductImageUrl = z.infer<typeof productImageUrlSchema>;

export const merchantSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  businessName: z.string().min(1),
  pinchConnectionMode: pinchConnectionModeSchema.nullable(),
  pinchMerchantId: z.string().nullable(),
  pinchPublishableKey: z.string().nullable(),
  pinchComplianceStatus: pinchComplianceStatusSchema.nullable(),
  pinchMerchantStatus: z.string().nullable(),
  storeSlug: z.string().nullable(),
  description: z.string().nullable(),
  logoUrl: z.string().url().nullable(),
  isStoreOpen: z.boolean(),
  createdAt: z.coerce.date(),
});
export type Merchant = z.infer<typeof merchantSchema>;

export const productSchema = z.object({
  id: z.string().uuid(),
  merchantId: z.string().uuid(),
  slug: z.string().min(1),
  name: z.string().min(1),
  priceCents: z.number().int().positive(),
  description: z.string().nullable(),
  imageUrl: productImageUrlSchema.nullable(),
  stockCount: z.number().int().nonnegative().nullable(),
  isAvailable: z.boolean(),
  sortOrder: z.number().int(),
  createdAt: z.coerce.date(),
});
export type Product = z.infer<typeof productSchema>;

export const orderItemSchema = z.object({
  id: z.string().uuid(),
  orderId: z.string().uuid(),
  productId: z.string().uuid(),
  productName: z.string().min(1),
  unitPriceCents: z.number().int().positive(),
  quantity: z.number().int().positive(),
  lineTotalCents: z.number().int().positive(),
});
export type OrderItem = z.infer<typeof orderItemSchema>;

export const orderSchema = z.object({
  id: z.string().uuid(),
  merchantId: z.string().uuid(),
  customerName: z.string().min(1),
  customerEmail: z.string().email(),
  customerPhone: z.string().nullable(),
  /** Snapshotted total — source of truth for charge and history */
  totalCents: z.number().int().positive(),
  payerId: z.string().nullable(),
  paymentId: z.string().nullable(),
  status: orderStatusSchema,
  createdAt: z.coerce.date(),
  paidAt: z.coerce.date().nullable(),
});
export type Order = z.infer<typeof orderSchema>;
