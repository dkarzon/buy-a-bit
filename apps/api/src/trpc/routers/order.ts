import {
  orderCreateInput,
  orderGetBySessionInput,
  orderListForMerchantInput,
} from "@buy-a-bit/shared";
import { and, desc, eq, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

import { merchants, orderItems, orders, products } from "../../db/schema.js";
import {
  mergeOrderLineRefs,
  summarizeOrderItems,
} from "../../services/orders.js";
import { merchantProcedure, publicProcedure, router } from "../trpc.js";

export const orderRouter = router({
  create: publicProcedure
    .input(orderCreateInput)
    .mutation(async ({ ctx, input }) => {
      const lineRefs = mergeOrderLineRefs(input.items);
      const productIds = lineRefs.map((line) => line.productId);

      const rows = await ctx.db
        .select({
          productId: products.id,
          merchantId: products.merchantId,
          name: products.name,
          priceCents: products.priceCents,
          isAvailable: products.isAvailable,
          stockCount: products.stockCount,
          isStoreOpen: merchants.isStoreOpen,
        })
        .from(products)
        .innerJoin(merchants, eq(products.merchantId, merchants.id))
        .where(inArray(products.id, productIds));

      if (rows.length !== productIds.length) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "One or more products were not found",
        });
      }

      const byId = new Map(rows.map((row) => [row.productId, row]));
      const merchantId = rows[0]!.merchantId;

      if (rows.some((row) => row.merchantId !== merchantId)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "All products in an order must belong to the same merchant",
        });
      }

      if (!rows[0]!.isStoreOpen) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Store is currently closed",
        });
      }

      const snapshots: {
        productId: string;
        productName: string;
        unitPriceCents: number;
        quantity: number;
        lineTotalCents: number;
      }[] = [];

      for (const line of lineRefs) {
        const row = byId.get(line.productId)!;

        if (!row.isAvailable) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: `"${row.name}" is not available`,
          });
        }

        if (row.stockCount !== null && row.stockCount < line.quantity) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message:
              row.stockCount <= 0
                ? `"${row.name}" is out of stock`
                : `Not enough stock for "${row.name}"`,
          });
        }

        const lineTotalCents = row.priceCents * line.quantity;
        snapshots.push({
          productId: row.productId,
          productName: row.name,
          unitPriceCents: row.priceCents,
          quantity: line.quantity,
          lineTotalCents,
        });
      }

      const totalCents = snapshots.reduce(
        (sum, line) => sum + line.lineTotalCents,
        0,
      );

      if (totalCents <= 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Order total must be greater than zero",
        });
      }

      const created = await ctx.db.transaction(async (tx) => {
        const [order] = await tx
          .insert(orders)
          .values({
            merchantId,
            // Signed-in customers get the order on their account; guests stay null
            userId: ctx.user?.id ?? null,
            customerName: input.customerName,
            customerEmail: input.customerEmail,
            customerPhone: input.customerPhone ?? null,
            totalCents,
            status: "pending",
          })
          .returning({ id: orders.id });

        if (!order) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create order",
          });
        }

        await tx.insert(orderItems).values(
          snapshots.map((line) => ({
            orderId: order.id,
            productId: line.productId,
            productName: line.productName,
            unitPriceCents: line.unitPriceCents,
            quantity: line.quantity,
            lineTotalCents: line.lineTotalCents,
          })),
        );

        return order;
      });

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
          merchantId: orders.merchantId,
          customerName: orders.customerName,
          customerEmail: orders.customerEmail,
          customerPhone: orders.customerPhone,
          totalCents: orders.totalCents,
          payerId: orders.payerId,
          paymentId: orders.paymentId,
          status: orders.status,
          createdAt: orders.createdAt,
          paidAt: orders.paidAt,
        })
        .from(orders)
        .where(eq(orders.id, input.session))
        .limit(1);

      if (!order) {
        return null;
      }

      const items = await ctx.db
        .select({
          id: orderItems.id,
          orderId: orderItems.orderId,
          productId: orderItems.productId,
          productName: orderItems.productName,
          unitPriceCents: orderItems.unitPriceCents,
          quantity: orderItems.quantity,
          lineTotalCents: orderItems.lineTotalCents,
        })
        .from(orderItems)
        .where(eq(orderItems.orderId, order.id));

      return { ...order, items };
    }),

  listForMerchant: merchantProcedure
    .input(orderListForMerchantInput)
    .query(async ({ ctx, input }) => {
      const status = input?.status;
      const limit = input?.limit ?? 50;

      const conditions = [eq(orders.merchantId, ctx.merchant.id)];
      if (status) {
        conditions.push(eq(orders.status, status));
      }

      const orderRows = await ctx.db
        .select({
          id: orders.id,
          customerName: orders.customerName,
          customerEmail: orders.customerEmail,
          status: orders.status,
          totalCents: orders.totalCents,
          createdAt: orders.createdAt,
          paidAt: orders.paidAt,
        })
        .from(orders)
        .where(and(...conditions))
        .orderBy(desc(orders.createdAt))
        .limit(limit);

      if (orderRows.length === 0) {
        return [];
      }

      const itemRows = await ctx.db
        .select({
          orderId: orderItems.orderId,
          productName: orderItems.productName,
        })
        .from(orderItems)
        .where(
          inArray(
            orderItems.orderId,
            orderRows.map((row) => row.id),
          ),
        );

      const itemsByOrder = new Map<string, { productName: string }[]>();
      for (const item of itemRows) {
        const list = itemsByOrder.get(item.orderId) ?? [];
        list.push({ productName: item.productName });
        itemsByOrder.set(item.orderId, list);
      }

      return orderRows.map((order) => {
        const items = itemsByOrder.get(order.id) ?? [];
        return {
          id: order.id,
          productName: summarizeOrderItems(items),
          itemCount: items.length || 1,
          customerName: order.customerName,
          customerEmail: order.customerEmail,
          status: order.status,
          totalCents: order.totalCents,
          createdAt: order.createdAt,
          paidAt: order.paidAt,
        };
      });
    }),
});
