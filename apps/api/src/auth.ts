/**
 * Better Auth — email/password for merchants (Pinch OAuth on Day 2).
 * Mounted on Hono at /api/auth/*.
 */
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { db } from "./db/index.js";
import * as schema from "./db/schema.js";

const webUrl = process.env.WEB_URL ?? "http://localhost:5173";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: [webUrl],
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
  },
});

export type Session = typeof auth.$Infer.Session;
