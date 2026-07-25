import { eq } from "drizzle-orm";
import type { Context } from "hono";

import { auth } from "../auth.js";
import { db } from "../db/index.js";
import { merchants } from "../db/schema.js";

import type { TrpcContext } from "./trpc.js";

export async function createContext(opts: {
  hono: Context;
}): Promise<TrpcContext> {
  const session = await auth.api.getSession({
    headers: opts.hono.req.raw.headers,
  });

  const merchant = session?.user
    ? ((await db.query.merchants.findFirst({
        where: eq(merchants.userId, session.user.id),
      })) ?? null)
    : null;

  return {
    db,
    session: session?.session ?? null,
    user: session?.user ?? null,
    merchant,
  };
}
