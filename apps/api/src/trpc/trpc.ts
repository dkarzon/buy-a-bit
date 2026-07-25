import { initTRPC, TRPCError } from "@trpc/server";

import type { Session } from "../auth.js";
import type { db as Db } from "../db/index.js";
import type { merchants } from "../db/schema.js";

type DbClient = typeof Db;
type Merchant = typeof merchants.$inferSelect;

export type TrpcContext = {
  db: DbClient;
  session: Session["session"] | null;
  user: Session["user"] | null;
  merchant: Merchant | null;
};

const t = initTRPC.context<TrpcContext>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

/**
 * Requires a Better Auth session.
 * Merchant may be null (e.g. post-signup before onboarding) — callers that need a
 * linked merchant should check `ctx.merchant` and throw FORBIDDEN if missing.
 */
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session || !ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Sign in required",
    });
  }

  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
      user: ctx.user,
    },
  });
});
