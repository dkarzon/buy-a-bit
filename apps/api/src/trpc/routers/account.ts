import {
  accountDeletePaymentMethodInput,
  accountListOrdersInput,
} from "@buy-a-bit/shared";
import { and, desc, eq, inArray, isNotNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

import {
  customerPayers,
  merchants,
  orderItems,
  orders,
} from "../../db/schema.js";
import { summarizeOrderItems } from "../../services/orders.js";
import { pinchClientForMerchant } from "../../services/pinch.js";
import { protectedProcedure, router } from "../trpc.js";

/** Signed-in customer's account — orders and saved payment methods. */
export const accountRouter = router({
  listOrders: protectedProcedure
    .input(accountListOrdersInput)
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 50;

      const orderRows = await ctx.db
        .select({
          id: orders.id,
          merchantName: merchants.businessName,
          status: orders.status,
          totalCents: orders.totalCents,
          createdAt: orders.createdAt,
          paidAt: orders.paidAt,
        })
        .from(orders)
        .innerJoin(merchants, eq(orders.merchantId, merchants.id))
        .where(eq(orders.userId, ctx.user.id))
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
          merchantName: order.merchantName,
          status: order.status,
          totalCents: order.totalCents,
          createdAt: order.createdAt,
          paidAt: order.paidAt,
        };
      });
    }),

  listPaymentMethods: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({
        id: customerPayers.id,
        merchantId: customerPayers.merchantId,
        merchantName: merchants.businessName,
        cardScheme: customerPayers.cardScheme,
        cardLast4: customerPayers.cardLast4,
        cardExpiryMonth: customerPayers.cardExpiryMonth,
        cardExpiryYear: customerPayers.cardExpiryYear,
        cardHolderName: customerPayers.cardHolderName,
        cardSavedAt: customerPayers.cardSavedAt,
      })
      .from(customerPayers)
      .innerJoin(merchants, eq(customerPayers.merchantId, merchants.id))
      .where(
        and(
          eq(customerPayers.userId, ctx.user.id),
          isNotNull(customerPayers.pinchSourceId),
        ),
      )
      .orderBy(desc(customerPayers.cardSavedAt));

    return rows;
  }),

  deletePaymentMethod: protectedProcedure
    .input(accountDeletePaymentMethodInput)
    .mutation(async ({ ctx, input }) => {
      const saved = await ctx.db.query.customerPayers.findFirst({
        where: and(
          eq(customerPayers.id, input.id),
          eq(customerPayers.userId, ctx.user.id),
        ),
      });

      if (!saved || !saved.pinchSourceId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Saved card not found",
        });
      }

      const merchant = await ctx.db.query.merchants.findFirst({
        where: eq(merchants.id, saved.merchantId),
      });

      // Remove the vaulted source at Pinch before clearing our reference —
      // otherwise the card would stay chargeable at the gateway. If the
      // merchant's Pinch connection is gone, the source's credential scope
      // is gone with it, so clearing locally is all that's left.
      if (merchant) {
        let pinch;
        try {
          pinch = pinchClientForMerchant(merchant);
        } catch {
          pinch = null;
        }

        if (pinch) {
          try {
            await pinch.deletePaymentSource(
              saved.pinchPayerId,
              saved.pinchSourceId,
            );
          } catch (err) {
            throw new TRPCError({
              code: "BAD_GATEWAY",
              message:
                err instanceof Error
                  ? err.message
                  : "Could not remove the card at the payment provider",
            });
          }
        }
      }

      // Keep the payer row for reuse; only the card reference is cleared
      await ctx.db
        .update(customerPayers)
        .set({
          pinchSourceId: null,
          cardScheme: null,
          cardLast4: null,
          cardExpiryMonth: null,
          cardExpiryYear: null,
          cardHolderName: null,
          cardSavedAt: null,
        })
        .where(eq(customerPayers.id, saved.id));

      return { id: saved.id };
    }),
});
