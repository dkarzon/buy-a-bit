import {
  merchantCreateInput,
  merchantUpdateProfileInput,
} from "@buy-a-bit/shared";

import { protectedProcedure, router } from "../trpc.js";

export const merchantRouter = router({
  me: protectedProcedure.query(async ({ ctx }) => {
    const { user, merchant } = ctx;

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name ?? null,
      },
      merchant: merchant
        ? {
            id: merchant.id,
            businessName: merchant.businessName,
            pinchConnectionMode: merchant.pinchConnectionMode,
            pinchMerchantId: merchant.pinchMerchantId,
            pinchMerchantStatus: merchant.pinchMerchantStatus,
            storeSlug: merchant.storeSlug,
            isStoreOpen: merchant.isStoreOpen,
          }
        : null,
    };
  }),

  create: protectedProcedure
    .input(merchantCreateInput)
    .mutation(async ({ input }) => {
      // Day 2: create merchants row linked to session.user.id
      void input;
      return null;
    }),

  updateProfile: protectedProcedure
    .input(merchantUpdateProfileInput)
    .mutation(async ({ input }) => {
      void input;
      return null;
    }),
});
