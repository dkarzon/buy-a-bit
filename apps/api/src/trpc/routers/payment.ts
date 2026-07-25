import {
  paymentChargeInput,
  paymentGetCheckoutContextInput,
  paymentGetStatusInput,
} from "@buy-a-bit/shared";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

import type { db as DbClient } from "../../db/index.js";
import { merchants, orderItems, orders, products } from "../../db/schema.js";
import {
  summarizeOrderItems,
  toPaymentLines,
} from "../../services/orders.js";
import {
  isPinchLiveMode,
  orderStatusFromPinchPayment,
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

export const paymentRouter = router({
  getCheckoutContext: publicProcedure
    .input(paymentGetCheckoutContextInput)
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select({
          orderId: orders.id,
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

      return {
        orderId: row.orderId,
        productName: summarizeOrderItems(lines),
        customerName: row.customerName,
        totalCents: row.totalCents,
        items: lines,
        publishableKey,
        status: row.status,
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

      let payerId = order.payerId;
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

      let payment;
      try {
        payment = await pinch.createRealtimePayment({
          payerId,
          amountCents: order.totalCents,
          creditCardToken: input.creditCardToken,
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
