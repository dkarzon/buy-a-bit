import type { Context } from "hono";

import type { TrpcContext } from "./trpc.js";

export async function createContext(_opts: {
  hono: Context;
}): Promise<TrpcContext> {
  // Day 1: load Better Auth session + merchant row
  return {};
}
