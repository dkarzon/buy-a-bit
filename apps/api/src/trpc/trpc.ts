import { initTRPC, TRPCError } from "@trpc/server";

export type TrpcContext = {
  // Day 1: db, user, session, merchant, pinchClient
};

const t = initTRPC.context<TrpcContext>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

/** Requires Better Auth session + linked merchant — implemented Day 1 */
export const protectedProcedure = t.procedure.use(() => {
  throw new TRPCError({
    code: "UNAUTHORIZED",
    message: "Auth not wired yet — implement Better Auth in Day 1",
  });
});
