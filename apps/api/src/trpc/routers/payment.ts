import {
  paymentChargeInput,
  paymentGetCheckoutContextInput,
  paymentGetStatusInput,
} from "@buy-a-bit/shared";

import { publicProcedure, router } from "../trpc.js";

export const paymentRouter = router({
  getCheckoutContext: publicProcedure
    .input(paymentGetCheckoutContextInput)
    .query(async ({ input }) => {
      // Day 1: order + publishableKey for CaptureJS → paymentGetCheckoutContextOutput
      void input;
      throw new Error("Not implemented");
    }),

  charge: publicProcedure
    .input(paymentChargeInput)
    .mutation(async ({ input }) => {
      // Day 1: createPayer + POST /payments/realtime → paymentChargeOutput
      void input;
      throw new Error("Not implemented");
    }),

  getStatus: publicProcedure
    .input(paymentGetStatusInput)
    .query(async ({ input }) => {
      // Day 2: order status for confirmation page → paymentGetStatusOutput
      void input;
      throw new Error("Not implemented");
    }),
});
