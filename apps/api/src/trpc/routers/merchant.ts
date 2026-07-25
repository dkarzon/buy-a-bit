import {
  merchantCreateInput,
  merchantUpdateProfileInput,
} from "@buy-a-bit/shared";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

import { merchants } from "../../db/schema.js";
import { merchantProcedure, protectedProcedure, router } from "../trpc.js";

function toMerchantPayload(merchant: typeof merchants.$inferSelect) {
  return {
    id: merchant.id,
    businessName: merchant.businessName,
    pinchConnectionMode: merchant.pinchConnectionMode,
    pinchMerchantId: merchant.pinchMerchantId,
    pinchMerchantStatus: merchant.pinchMerchantStatus,
    storeSlug: merchant.storeSlug,
    isStoreOpen: merchant.isStoreOpen,
  };
}

export const merchantRouter = router({
  me: protectedProcedure.query(async ({ ctx }) => {
    const { user, merchant } = ctx;

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name ?? null,
      },
      merchant: merchant ? toMerchantPayload(merchant) : null,
    };
  }),

  create: protectedProcedure
    .input(merchantCreateInput)
    .mutation(async ({ ctx, input }) => {
      if (ctx.merchant) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Store already set up for this account",
        });
      }

      if (input.pinchConnectionMode === "byok") {
        throw new TRPCError({
          code: "NOT_IMPLEMENTED",
          message: "BYOK onboarding is not available yet",
        });
      }

      // Managed Pinch merchant API call lands with Pinch service; local row first.
      const [created] = await ctx.db
        .insert(merchants)
        .values({
          userId: ctx.user.id,
          businessName: input.businessName,
          pinchConnectionMode: "managed",
          pinchComplianceStatus: "pending",
          pinchMerchantStatus: "unverified",
        })
        .returning();

      if (!created) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create store",
        });
      }

      return toMerchantPayload(created);
    }),

  updateProfile: merchantProcedure
    .input(merchantUpdateProfileInput)
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(merchants)
        .set({ businessName: input.businessName })
        .where(eq(merchants.id, ctx.merchant.id))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update profile",
        });
      }

      return toMerchantPayload(updated);
    }),
});
