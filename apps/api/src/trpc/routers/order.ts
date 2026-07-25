import {
  orderCreateCheckoutInput,
  orderGetBySessionInput,
  orderListForMerchantInput,
} from "@buy-a-bit/shared";

import { protectedProcedure, publicProcedure, router } from "../trpc.js";

export const orderRouter = router({
  createCheckout: publicProcedure
    .input(orderCreateCheckoutInput)
    .mutation(async ({ input }) => {
      // Day 1: create order + Pinch payment link → orderCreateCheckoutOutput
      void input;
      throw new Error("Not implemented");
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
