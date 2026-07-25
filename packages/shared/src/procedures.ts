import { z } from "zod";

import { orderStatusSchema, productImageUrlSchema } from "./schemas.js";

// ─── merchant ───────────────────────────────────────────────────────────────

export const merchantMeOutput = z.object({
  merchant: z
    .object({
      id: z.string().uuid(),
      businessName: z.string(),
      pinchConnectionMode: z.enum(["managed", "byok"]).nullable(),
      pinchMerchantId: z.string().nullable(),
      pinchMerchantStatus: z.string().nullable(),
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

export const merchantCreateInput = z.discriminatedUnion("pinchConnectionMode", [
  z.object({
    businessName: z.string().min(1).max(120),
    pinchConnectionMode: z.literal("managed"),
    companyEmail: z.string().email().optional(),
    companyPhone: z.string().optional(),
  }),
  z.object({
    businessName: z.string().min(1).max(120),
    pinchConnectionMode: z.literal("byok"),
    pinchApplicationId: z.string().min(1),
    pinchSecretKey: z.string().min(1),
    pinchPublishableKey: z.string().min(1),
  }),
]);

// ─── product ────────────────────────────────────────────────────────────────

export const productCreateInput = z.object({
  name: z.string().min(1).max(120),
  priceCents: z.number().int().positive(),
  description: z.string().max(2000).optional(),
  imageUrl: productImageUrlSchema.optional(),
  stockCount: z.number().int().nonnegative().optional(),
});

export const productUpdateInput = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(120).optional(),
  priceCents: z.number().int().positive().optional(),
  description: z.string().max(2000).nullable().optional(),
  imageUrl: productImageUrlSchema.nullable().optional(),
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

/** Merchant product detail — edit page, includes QR for the landing URL */
export const productMerchantDetailOutput = z.object({
  id: z.string().uuid(),
  merchantId: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
  priceCents: z.number().int(),
  description: z.string().nullable(),
  imageUrl: z.string().nullable(),
  stockCount: z.number().int().nullable(),
  isAvailable: z.boolean(),
  sortOrder: z.number().int(),
  createdAt: z.coerce.date(),
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

export const orderCreateItemInput = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive().default(1),
});

export const orderCreateInput = z.object({
  items: z.array(orderCreateItemInput).min(1),
  customerName: z.string().min(1).max(120),
  customerEmail: z.string().email(),
  customerPhone: z.string().min(5).max(30).optional(),
});

/** Pending order → navigate to /pay/:orderId */
export const orderCreateOutput = z.object({
  orderId: z.string().uuid(),
  payPath: z.string(), // e.g. /pay/{orderId}
});

export const orderGetBySessionInput = z.object({
  session: z.string().uuid(), // orderId passed as ?session= on confirmation
});

export const orderListForMerchantInput = z
  .object({
    status: orderStatusSchema.optional(),
    limit: z.number().int().min(1).max(100).default(50),
  })
  .optional();

export const orderListItem = z.object({
  id: z.string().uuid(),
  /** Display summary, e.g. "Widget" or "Widget + 2 more" */
  productName: z.string(),
  itemCount: z.number().int().positive(),
  customerName: z.string(),
  customerEmail: z.string().email(),
  status: orderStatusSchema,
  totalCents: z.number().int().positive(),
  createdAt: z.coerce.date(),
  paidAt: z.coerce.date().nullable(),
});

// ─── payment ────────────────────────────────────────────────────────────────

export const paymentGetCheckoutContextInput = z.object({
  orderId: z.string().uuid(),
});

export const paymentOrderLineOutput = z.object({
  productName: z.string(),
  quantity: z.number().int().positive(),
  lineTotalCents: z.number().int().positive(),
});

/** Saved-card display metadata — Pinch references only, never card data */
export const savedCardSummary = z.object({
  cardScheme: z.string().nullable(),
  cardLast4: z.string().nullable(),
  cardExpiryMonth: z.number().int().nullable(),
  cardExpiryYear: z.number().int().nullable(),
  cardHolderName: z.string().nullable(),
});

export const paymentGetCheckoutContextOutput = z.object({
  orderId: z.string().uuid(),
  merchantId: z.string().uuid(),
  merchantName: z.string(),
  /** Summary label for single-line UI */
  productName: z.string(),
  customerName: z.string(),
  totalCents: z.number().int().positive(),
  items: z.array(paymentOrderLineOutput).min(1),
  publishableKey: z.string().min(1),
  status: orderStatusSchema,
  /** Signed-in customer's stored card for this merchant, if any */
  savedCard: savedCardSummary.nullable(),
  /** True when the session customer may save a card on this order */
  canSaveCard: z.boolean(),
});

export const paymentChargeInput = z
  .object({
    orderId: z.string().uuid(),
    /** Fresh CaptureJS token — required unless paying with the saved card */
    creditCardToken: z.string().min(1).optional(),
    /** Vault this card for next time (signed-in customers only) */
    saveCard: z.boolean().optional().default(false),
    /** Charge the signed-in customer's stored card for this merchant */
    useSavedCard: z.boolean().optional().default(false),
  })
  .refine((value) => Boolean(value.creditCardToken) !== value.useSavedCard, {
    message: "Provide creditCardToken or useSavedCard, not both",
  });

export const paymentChargeOutput = z.object({
  orderId: z.string().uuid(),
  status: orderStatusSchema,
  paymentId: z.string().nullable(),
  confirmationPath: z.string(), // e.g. /payment/complete?session={orderId}
});

export const paymentGetStatusInput = z.object({
  session: z.string().uuid(), // orderId from /payment/complete?session=
});

export const paymentGetStatusOutput = z.object({
  orderId: z.string().uuid(),
  status: orderStatusSchema,
  productName: z.string(),
  customerName: z.string(),
  totalCents: z.number().int().positive(),
  items: z.array(paymentOrderLineOutput).min(1),
});

// ─── account (signed-in customer) ───────────────────────────────────────────

export const accountListOrdersInput = z
  .object({
    limit: z.number().int().min(1).max(100).default(50),
  })
  .optional();

export const accountOrderListItem = z.object({
  id: z.string().uuid(),
  /** Display summary, e.g. "Widget" or "Widget + 2 more" */
  productName: z.string(),
  itemCount: z.number().int().positive(),
  merchantName: z.string(),
  status: orderStatusSchema,
  totalCents: z.number().int().positive(),
  createdAt: z.coerce.date(),
  paidAt: z.coerce.date().nullable(),
});

export const accountPaymentMethodOutput = z.object({
  /** customer_payers row id */
  id: z.string().uuid(),
  merchantId: z.string().uuid(),
  merchantName: z.string(),
  cardScheme: z.string().nullable(),
  cardLast4: z.string().nullable(),
  cardExpiryMonth: z.number().int().nullable(),
  cardExpiryYear: z.number().int().nullable(),
  cardHolderName: z.string().nullable(),
  cardSavedAt: z.coerce.date().nullable(),
});

export const accountDeletePaymentMethodInput = z.object({
  id: z.string().uuid(),
});

export const accountMerchantForCardOutput = z.object({
  id: z.string().uuid(),
  businessName: z.string(),
});

export const accountGetSaveCardContextInput = z.object({
  merchantId: z.string().uuid(),
});

export const accountGetSaveCardContextOutput = z.object({
  merchantId: z.string().uuid(),
  merchantName: z.string(),
  publishableKey: z.string().min(1),
});

export const accountSavePaymentMethodInput = z.object({
  merchantId: z.string().uuid(),
  /** CaptureJS token — never send raw card numbers to the API */
  creditCardToken: z.string().min(1),
});