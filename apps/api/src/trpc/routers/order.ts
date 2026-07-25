import {
  orderCreateInput,
  orderGetBySessionInput,
  orderListForMerchantInput,
} from "@buy-a-bit/shared";
import { and, desc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

import { merchants, orders, products } from "../../db/schema.js";
import { protectedProcedure, publicProcedure, router } from "../trpc.js";

export const orderRouter = router({
  create: publicProcedure
    .input(orderCreateInput)
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select({
          productId: products.id,
          merchantId: products.merchantId,
          isAvailable: products.isAvailable,
          stockCount: products.stockCount,
          isStoreOpen: merchants.isStoreOpen,
        })
        .from(products)
        .innerJoin(merchants, eq(products.merchantId, merchants.id))
        .where(eq(products.id, input.productId))
        .limit(1);

      if (!row) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Product not found",
        });
      }

      if (!row.isStoreOpen) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Store is currently closed",
        });
      }

      if (!row.isAvailable) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Product is not available",
        });
      }

      if (row.stockCount !== null && row.stockCount <= 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Product is out of stock",
        });
      }

      const [created] = await ctx.db
        .insert(orders)
        .values({
          productId: row.productId,
          merchantId: row.merchantId,
          customerName: input.customerName,
          customerEmail: input.customerEmail,
          customerPhone: input.customerPhone ?? null,
          status: "pending",
        })
        .returning({ id: orders.id });

      if (!created) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create order",
        });
      }

      return {
        orderId: created.id,
        payPath: `/pay/${created.id}`,
      };
    }),

  /** Public confirmation lookup — `session` is the order id from ?session= */
  getBySession: publicProcedure
    .input(orderGetBySessionInput)
    .query(async ({ ctx, input }) => {
      const [order] = await ctx.db
        .select({
          id: orders.id,
          productId: orders.productId,
          merchantId: orders.merchantId,
          customerName: orders.customerName,
          customerEmail: orders.customerEmail,
          customerPhone: orders.customerPhone,
          payerId: orders.payerId,
          paymentId: orders.paymentId,
          status: orders.status,
          createdAt: orders.createdAt,
          paidAt: orders.paidAt,
        })
        .from(orders)
        .where(eq(orders.id, input.session))
        .limit(1);

      return order ?? null;
    }),

  listForMerchant: protectedProcedure
    .input(orderListForMerchantInput)
    .query(async ({ ctx, input }) => {
      if (!ctx.merchant) {
        return [];
      }

      const status = input?.status;
      const limit = input?.limit ?? 50;

      const conditions = [eq(orders.merchantId, ctx.merchant.id)];
      if (status) {
        conditions.push(eq(orders.status, status));
      }

      return ctx.db
        .select({
          id: orders.id,
          productId: orders.productId,
          productName: products.name,
          customerName: orders.customerName,
          customerEmail: orders.customerEmail,
          status: orders.status,
          priceCents: products.priceCents,
          createdAt: orders.createdAt,
          paidAt: orders.paidAt,
        })
        .from(orders)
        .innerJoin(products, eq(orders.productId, products.id))
        .where(and(...conditions))
        .orderBy(desc(orders.createdAt))
        .limit(limit);
    }),
});
