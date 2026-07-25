import {
  merchantCreateInput,
  merchantUpdateProfileInput,
} from "@buy-a-bit/shared";

import { protectedProcedure, router } from "../trpc.js";

export const merchantRouter = router({
  me: protectedProcedure.query(async () => {
    // Day 1: return session user + merchant (or null merchant → onboarding)
    return null;
  }),

  create: protectedProcedure
    .input(merchantCreateInput)
    .mutation(async ({ input }) => {
      // Day 1: create merchants row linked to session.user.id
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
