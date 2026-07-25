import {
  paymentChargeInput,
  paymentGetCheckoutContextInput,
  paymentGetStatusInput,
} from "@buy-a-bit/shared";
import { and, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

import type { db as DbClient } from "../../db/index.js";
import {
  customerPayers,
  merchants,
  orderItems,
  orders,
  products,
} from "../../db/schema.js";
import {
  summarizeOrderItems,
  toPaymentLines,
} from "../../services/orders.js";
import type { PinchClient } from "../../services/pinch.js";
import {
  isPinchLiveMode,
  orderStatusFromPinchPayment,
  parsePinchExpiry,
  pinchClientForMerchant,
  publishableKeyForMerchant,
  splitCustomerName,
} from "../../services/pinch.js";
import { publicProcedure, router } from "../trpc.js";

async function loadOrderItems(db: typeof DbClient, orderId: string) {
  return db
    .select({
      productId: orderItems.productId,
      productName: orderItems.productName,
      quantity: orderItems.quantity,
      lineTotalCents: orderItems.lineTotalCents,
      isAvailable: products.isAvailable,
      stockCount: products.stockCount,
    })
    .from(orderItems)
    .innerJoin(products, eq(orderItems.productId, products.id))
    .where(eq(orderItems.orderId, orderId));
}

async function findCustomerPayer(
  db: typeof DbClient,
  userId: string,
  merchantId: string,
) {
  return (
    (await db.query.customerPayers.findFirst({
      where: and(
        eq(customerPayers.userId, userId),
        eq(customerPayers.merchantId, merchantId),
      ),
    })) ?? null
  );
}

/** Get or create the customer's per-merchant Pinch payer row (race-safe). */
async function getOrCreateCustomerPayer(
  db: typeof DbClient,
  pinch: PinchClient,
  input: {
    userId: string;
    merchantId: string;
    firstName: string;
    lastName?: string;
    emailAddress: string;
    mobileNumber?: string;
  },
) {
  const existing = await findCustomerPayer(db, input.userId, input.merchantId);
  if (existing) return existing;

  const payer = await pinch.createPayer({
    firstName: input.firstName,
    lastName: input.lastName,
    emailAddress: input.emailAddress,
    mobileNumber: input.mobileNumber,
  });

  const [created] = await db
    .insert(customerPayers)
    .values({
      userId: input.userId,
      merchantId: input.merchantId,
      pinchPayerId: payer.id,
    })
    .onConflictDoNothing()
    .returning();

  if (created) return created;

  // Concurrent request won the unique (userId, merchantId) race — reuse its row
  const winner = await findCustomerPayer(db, input.userId, input.merchantId);
  if (!winner) {
    throw new Error("Failed to persist customer payer");
  }
  return winner;
}

export const paymentRouter = router({
  getCheckoutContext: publicProcedure
    .input(paymentGetCheckoutContextInput)
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select({
          orderId: orders.id,
          orderUserId: orders.userId,
          customerName: orders.customerName,
          status: orders.status,
          totalCents: orders.totalCents,
          merchant: merchants,
        })
        .from(orders)
        .innerJoin(merchants, eq(orders.merchantId, merchants.id))
        .where(eq(orders.id, input.orderId))
        .limit(1);

      if (!row) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Order not found",
        });
      }

      const items = await loadOrderItems(ctx.db, row.orderId);
      if (items.length === 0) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Order has no line items",
        });
      }

      let publishableKey: string;
      try {
        publishableKey = publishableKeyForMerchant(row.merchant);
      } catch (err) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            err instanceof Error
              ? err.message
              : "Merchant publishable key is not configured",
        });
      }

      const lines = toPaymentLines(items);

      // Saved-card options only for the signed-in owner of the order
      // (guest orders can be claimed by whoever is signed in at payment)
      const canActOnOrder = Boolean(
        ctx.user && (!row.orderUserId || row.orderUserId === ctx.user.id),
      );
      const saved =
        canActOnOrder && ctx.user
          ? await findCustomerPayer(ctx.db, ctx.user.id, row.merchant.id)
          : null;

      return {
        orderId: row.orderId,
        productName: summarizeOrderItems(lines),
        customerName: row.customerName,
        totalCents: row.totalCents,
        items: lines,
        publishableKey,
        status: row.status,
        savedCard: saved?.pinchSourceId
          ? {
              cardScheme: saved.cardScheme,
              cardLast4: saved.cardLast4,
              cardExpiryMonth: saved.cardExpiryMonth,
              cardExpiryYear: saved.cardExpiryYear,
              cardHolderName: saved.cardHolderName,
            }
          : null,
        canSaveCard: canActOnOrder,
      };
    }),

  charge: publicProcedure
    .input(paymentChargeInput)
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select({
          order: orders,
          merchant: merchants,
        })
        .from(orders)
        .innerJoin(merchants, eq(orders.merchantId, merchants.id))
        .where(eq(orders.id, input.orderId))
        .limit(1);

      if (!row) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Order not found",
        });
      }

      const { order, merchant } = row;

      if (order.status === "paid") {
        return {
          orderId: order.id,
          status: order.status,
          paymentId: order.paymentId,
          confirmationPath: `/payment/complete?session=${order.id}`,
        };
      }

      if (order.status !== "pending" && order.status !== "failed") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `Order cannot be charged (status: ${order.status})`,
        });
      }

      const items = await loadOrderItems(ctx.db, order.id);
      if (items.length === 0) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Order has no line items",
        });
      }

      for (const item of items) {
        if (!item.isAvailable) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: `"${item.productName}" is not available`,
          });
        }
        if (item.stockCount !== null && item.stockCount < item.quantity) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message:
              item.stockCount <= 0
                ? `"${item.productName}" is out of stock`
                : `Not enough stock for "${item.productName}"`,
          });
        }
      }

      if (!merchant.isStoreOpen) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Store is currently closed",
        });
      }

      // Live-payment gate (managed): sandbox demos allowed while unverified
      if (
        isPinchLiveMode() &&
        merchant.pinchConnectionMode === "managed" &&
        merchant.pinchMerchantStatus !== "active"
      ) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Merchant is not active for live payments",
        });
      }

      let pinch;
      try {
        pinch = pinchClientForMerchant(merchant);
      } catch (err) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            err instanceof Error
              ? err.message
              : "Merchant Pinch credentials are not configured",
        });
      }

      const { firstName, lastName } = splitCustomerName(order.customerName);
      const productName = summarizeOrderItems(items);

      // Order id alone authorises a fresh-token charge (guest checkout).
      // Anything touching a stored card additionally requires the session
      // user to own (or claim) the order — an order id must never be enough
      // to charge a card on file.
      const sessionUser = ctx.user;
      const ownsOrder = Boolean(
        sessionUser && (!order.userId || order.userId === sessionUser.id),
      );

      let payerId = order.payerId;
      /** When true, charge the payer's vaulted source (no token in the call) */
      let useStoredSource = false;

      if (input.useSavedCard) {
        if (!sessionUser) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Sign in to pay with a saved card",
          });
        }
        if (!ownsOrder) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "This order belongs to another account",
          });
        }

        const saved = await findCustomerPayer(
          ctx.db,
          sessionUser.id,
          merchant.id,
        );
        if (!saved?.pinchSourceId) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "No saved card for this store",
          });
        }

        payerId = saved.pinchPayerId;
        useStoredSource = true;
      } else if (input.saveCard && sessionUser && ownsOrder) {
        // Vault-then-charge: the CaptureJS token is consumed by vaulting, so
        // the payment below runs against the stored source. One card per
        // merchant — an existing source is deleted before the new one is
        // vaulted so the payer never holds two.
        try {
          const saved = await getOrCreateCustomerPayer(ctx.db, pinch, {
            userId: sessionUser.id,
            merchantId: merchant.id,
            firstName,
            lastName: lastName || undefined,
            emailAddress: order.customerEmail,
            mobileNumber: order.customerPhone ?? undefined,
          });

          if (saved.pinchSourceId) {
            await pinch.deletePaymentSource(
              saved.pinchPayerId,
              saved.pinchSourceId,
            );
          }

          const source = await pinch.createPaymentSource({
            payerId: saved.pinchPayerId,
            creditCardToken: input.creditCardToken!,
          });
          const expiry = parsePinchExpiry(source.expiryDate);

          await ctx.db
            .update(customerPayers)
            .set({
              pinchSourceId: source.id,
              cardScheme: source.cardScheme,
              cardLast4: source.displayCardNumber,
              cardExpiryMonth: expiry.month,
              cardExpiryYear: expiry.year,
              cardHolderName: source.cardHolderName,
              cardSavedAt: new Date(),
            })
            .where(eq(customerPayers.id, saved.id));

          payerId = saved.pinchPayerId;
          useStoredSource = true;
        } catch (err) {
          // No charge has been attempted yet — safe to abort
          throw new TRPCError({
            code: "BAD_GATEWAY",
            message: `Could not save your card — no payment was taken. ${
              err instanceof Error ? err.message : "Please try again."
            }`,
          });
        }
      } else {
        if (!input.creditCardToken) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Card details are required",
          });
        }

        if (!payerId) {
          try {
            const payer = await pinch.createPayer({
              firstName,
              lastName: lastName || undefined,
              emailAddress: order.customerEmail,
              mobileNumber: order.customerPhone ?? undefined,
            });
            payerId = payer.id;
          } catch (err) {
            throw new TRPCError({
              code: "BAD_GATEWAY",
              message:
                err instanceof Error
                  ? err.message
                  : "Failed to create Pinch payer",
            });
          }
        }
      }

      // Signed-in owner claims a guest order at payment time
      const orderUserId = sessionUser && ownsOrder ? sessionUser.id : order.userId;

      let payment;
      try {
        payment = await pinch.createRealtimePayment({
          payerId,
          amountCents: order.totalCents,
          creditCardToken: useStoredSource ? undefined : input.creditCardToken,
          description: productName.slice(0, 200),
          nonce: order.id,
          metadata: {
            orderId: order.id,
            merchantId: merchant.id,
            customerName: order.customerName,
            customerEmail: order.customerEmail,
          },
        });
      } catch (err) {
        await ctx.db
          .update(orders)
          .set({
            payerId,
            userId: orderUserId,
            status: "failed",
          })
          .where(eq(orders.id, order.id));

        throw new TRPCError({
          code: "BAD_GATEWAY",
          message:
            err instanceof Error
              ? err.message
              : "Pinch realtime payment failed",
        });
      }

      const status = orderStatusFromPinchPayment(payment);
      const paidAt = status === "paid" ? new Date() : null;

      await ctx.db
        .update(orders)
        .set({
          payerId,
          userId: orderUserId,
          paymentId: payment.id,
          status,
          paidAt,
        })
        .where(eq(orders.id, order.id));

      return {
        orderId: order.id,
        status,
        paymentId: payment.id,
        confirmationPath: `/payment/complete?session=${order.id}`,
      };
    }),

  getStatus: publicProcedure
    .input(paymentGetStatusInput)
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select({
          orderId: orders.id,
          status: orders.status,
          customerName: orders.customerName,
          totalCents: orders.totalCents,
        })
        .from(orders)
        .where(eq(orders.id, input.session))
        .limit(1);

      if (!row) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Order not found",
        });
      }

      const items = await ctx.db
        .select({
          productName: orderItems.productName,
          quantity: orderItems.quantity,
          lineTotalCents: orderItems.lineTotalCents,
        })
        .from(orderItems)
        .where(eq(orderItems.orderId, row.orderId));

      if (items.length === 0) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Order has no line items",
        });
      }

      const lines = toPaymentLines(items);

      return {
        orderId: row.orderId,
        status: row.status,
        productName: summarizeOrderItems(lines),
        customerName: row.customerName,
        totalCents: row.totalCents,
        items: lines,
      };
    }),
});
