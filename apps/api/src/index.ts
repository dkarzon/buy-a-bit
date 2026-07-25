import { serve } from "@hono/node-server";
import { trpcServer } from "@hono/trpc-server";
import { LOCAL_API_PORT } from "@buy-a-bit/shared";
import { Hono } from "hono";
import { cors } from "hono/cors";

import { createContext } from "./trpc/context.js";
import { appRouter } from "./trpc/router.js";
import { pinchWebhook } from "./webhooks/pinch.js";

const webOrigin = process.env.WEB_URL ?? "http://localhost:5173";
const port = Number(process.env.PORT ?? LOCAL_API_PORT);

const app = new Hono();

app.use(
  "*",
  cors({
    origin: webOrigin,
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  }),
);

app.get("/health", (c) => c.json({ ok: true }));

// Day 1: Better Auth — app.on(["POST", "GET"], "/api/auth/*", ...)

app.use(
  "/trpc/*",
  trpcServer({
    router: appRouter,
    createContext: (_opts, c) => createContext({ hono: c }),
  }),
);

app.route("/webhooks/pinch", pinchWebhook);

console.log(`API listening on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});

export type { AppRouter } from "./trpc/router.js";
