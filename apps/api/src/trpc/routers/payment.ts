import { paymentVerifyReturnInput } from "@buy-a-bit/shared";

import { publicProcedure, router } from "../trpc.js";

export const paymentRouter = router({
  verifyReturn: publicProcedure
    .input(paymentVerifyReturnInput)
    .query(async ({ input }) => {
      // Day 2: verify order/payment status → paymentVerifyReturnOutput
      void input;
      throw new Error("Not implemented");
    }),
});
