import {
  productCreateInput,
  productGetBySlugInput,
  productIdInput,
  productUpdateInput,
} from "@buy-a-bit/shared";

import { protectedProcedure, publicProcedure, router } from "../trpc.js";

export const productRouter = router({
  list: protectedProcedure.query(async () => {
    // Day 1: list products for ctx.merchant
    return [];
  }),

  create: protectedProcedure
    .input(productCreateInput)
    .mutation(async ({ input }) => {
      // Day 1: insert product, generate slug + QR, return productCreateOutput
      void input;
      throw new Error("Not implemented");
    }),

  update: protectedProcedure
    .input(productUpdateInput)
    .mutation(async ({ input }) => {
      void input;
      throw new Error("Not implemented");
    }),

  delete: protectedProcedure
    .input(productIdInput)
    .mutation(async ({ input }) => {
      void input;
      throw new Error("Not implemented");
    }),

  getBySlug: publicProcedure
    .input(productGetBySlugInput)
    .query(async ({ input }) => {
      // Day 1: public landing-page lookup → productPublicOutput
      void input;
      return null;
    }),
});
