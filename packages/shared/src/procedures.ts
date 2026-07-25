import { z } from "zod";

import { orderStatusSchema } from "./schemas.js";

// ─── merchant ───────────────────────────────────────────────────────────────

export const merchantMeOutput = z.object({
  merchant: z
    .object({
      id: z.string().uuid(),
      businessName: z.string(),
      pinchAccountId: z.string().nullable(),
      storeSlug: z.string().nullable(),
      isStoreOpen: z.boolean(),
    })
    .nullable(),
  user: z.object({
    id: z.string(),
    email: z.string().email(),
    name: z.string().nullable(),
  }),
});

export const merchantUpdateProfileInput = z.object({
  businessName: z.string().min(1).max(120),
});

export const merchantCreateInput = z.object({
  businessName: z.string().min(1).max(120),
});

// ─── product ────────────────────────────────────────────────────────────────

export const productCreateInput = z.object({
  name: z.string().min(1).max(120),
  priceCents: z.number().int().positive(),
  description: z.string().max(2000).optional(),
  imageUrl: z.string().url().optional(),
  stockCount: z.number().int().nonnegative().optional(),
});

export const productUpdateInput = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(120).optional(),
  priceCents: z.number().int().positive().optional(),
  description: z.string().max(2000).nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
  stockCount: z.number().int().nonnegative().nullable().optional(),
  isAvailable: z.boolean().optional(),
});

export const productIdInput = z.object({
  id: z.string().uuid(),
});

export const productGetBySlugInput = z.object({
  slug: z.string().min(1),
});

/** Returned from product.create — includes QR for instant dashboard display */
export const productCreateOutput = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
  priceCents: z.number().int(),
  description: z.string().nullable(),
  imageUrl: z.string().nullable(),
  stockCount: z.number().int().nullable(),
  qrDataUrl: z.string(),
  landingPageUrl: z.string().url(),
});

export const productPublicOutput = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
  priceCents: z.number().int(),
  description: z.string().nullable(),
  imageUrl: z.string().nullable(),
  stockCount: z.number().int().nullable(),
  isAvailable: z.boolean(),
  merchant: z.object({
    businessName: z.string(),
    isStoreOpen: z.boolean(),
  }),
});

// ─── order ──────────────────────────────────────────────────────────────────

export const orderCreateCheckoutInput = z.object({
  productId: z.string().uuid(),
  customerName: z.string().min(1).max(120),
  customerEmail: z.string().email(),
  customerPhone: z.string().min(5).max(30).optional(),
});

/** Sync point: Pinch checkout URL for frontend redirect */
export const orderCreateCheckoutOutput = z.object({
  orderId: z.string().uuid(),
  paymentUrl: z.string().url(),
});

export const orderGetBySessionInput = z.object({
  session: z.string().uuid(), // orderId passed as ?session= on return URL
});

export const orderListForMerchantInput = z
  .object({
    status: orderStatusSchema.optional(),
    limit: z.number().int().min(1).max(100).default(50),
  })
  .optional();

export const orderListItem = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  productName: z.string(),
  customerName: z.string(),
  customerEmail: z.string().email(),
  status: orderStatusSchema,
  priceCents: z.number().int(),
  createdAt: z.coerce.date(),
  paidAt: z.coerce.date().nullable(),
});

// ─── payment ────────────────────────────────────────────────────────────────

export const paymentVerifyReturnInput = z.object({
  session: z.string().uuid(), // orderId from /payment/complete?session=
});

export const paymentVerifyReturnOutput = z.object({
  orderId: z.string().uuid(),
  status: orderStatusSchema,
  productName: z.string(),
  customerName: z.string(),
  priceCents: z.number().int(),
});
