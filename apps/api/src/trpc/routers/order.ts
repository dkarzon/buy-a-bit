import {
  orderCreateInput,
  orderGetBySessionInput,
  orderListForMerchantInput,
} from "@buy-a-bit/shared";
import { eq } from "drizzle-orm";
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

  getBySession: publicProcedure
    .input(orderGetBySessionInput)
    .query(async ({ input }) => {
      void input;
      return null;
    }),

  listForMerchant: protectedProcedure
    .input(orderListForMerchantInput)
    .query(async ({ input }) => {
      void input;
      return [];
    }),
});
