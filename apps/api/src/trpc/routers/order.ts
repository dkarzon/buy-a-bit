import {
  orderCreateInput,
  orderGetBySessionInput,
  orderListForMerchantInput,
} from "@buy-a-bit/shared";

import { protectedProcedure, publicProcedure, router } from "../trpc.js";

export const orderRouter = router({
  create: publicProcedure.input(orderCreateInput).mutation(async ({ input }) => {
    // Day 1: create pending order → orderCreateOutput { orderId, payPath }
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
