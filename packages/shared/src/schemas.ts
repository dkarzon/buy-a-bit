import { z } from "zod";

/** Order payment lifecycle — matches DB enum and webhook mapping */
export const orderStatusSchema = z.enum(["pending", "paid", "failed"]);
export type OrderStatus = z.infer<typeof orderStatusSchema>;

export const merchantSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  pinchAccountId: z.string().nullable(),
  businessName: z.string().min(1),
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
  imageUrl: z.string().url().nullable(),
  stockCount: z.number().int().nonnegative().nullable(),
  isAvailable: z.boolean(),
  sortOrder: z.number().int(),
  createdAt: z.coerce.date(),
});
export type Product = z.infer<typeof productSchema>;

export const orderSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  merchantId: z.string().uuid(),
  customerName: z.string().min(1),
  customerEmail: z.string().email(),
  customerPhone: z.string().nullable(),
  paymentLinkId: z.string().nullable(),
  paymentId: z.string().nullable(),
  status: orderStatusSchema,
  createdAt: z.coerce.date(),
  paidAt: z.coerce.date().nullable(),
});
export type Order = z.infer<typeof orderSchema>;
