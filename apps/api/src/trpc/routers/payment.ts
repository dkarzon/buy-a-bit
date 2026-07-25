import {
  paymentChargeInput,
  paymentGetCheckoutContextInput,
  paymentGetStatusInput,
} from "@buy-a-bit/shared";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

import { merchants, orders, products } from "../../db/schema.js";
import {
  isPinchLiveMode,
  orderStatusFromPinchPayment,
  pinchClientForMerchant,
  publishableKeyForMerchant,
  splitCustomerName,
} from "../../services/pinch.js";
import { publicProcedure, router } from "../trpc.js";

export const paymentRouter = router({
  getCheckoutContext: publicProcedure
    .input(paymentGetCheckoutContextInput)
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select({
          orderId: orders.id,
          customerName: orders.customerName,
          status: orders.status,
          productName: products.name,
          priceCents: products.priceCents,
          merchant: merchants,
        })
        .from(orders)
        .innerJoin(products, eq(orders.productId, products.id))
        .innerJoin(merchants, eq(orders.merchantId, merchants.id))
        .where(eq(orders.id, input.orderId))
        .limit(1);

      if (!row) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Order not found",
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

      return {
        orderId: row.orderId,
        productName: row.productName,
        customerName: row.customerName,
        priceCents: row.priceCents,
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
          product: products,
          merchant: merchants,
        })
        .from(orders)
        .innerJoin(products, eq(orders.productId, products.id))
        .innerJoin(merchants, eq(orders.merchantId, merchants.id))
        .where(eq(orders.id, input.orderId))
        .limit(1);

      if (!row) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Order not found",
        });
      }

      const { order, product, merchant } = row;

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

      if (!product.isAvailable) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Product is not available",
        });
      }

      if (product.stockCount !== null && product.stockCount <= 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Product is out of stock",
        });
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
          amountCents: product.priceCents,
          creditCardToken: input.creditCardToken,
          description: product.name.slice(0, 200),
          nonce: order.id,
          metadata: {
            orderId: order.id,
            productId: product.id,
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
    .query(async ({ input }) => {
      // Day 2: order status for confirmation page
      void input;
      throw new Error("Not implemented");
    }),
});
