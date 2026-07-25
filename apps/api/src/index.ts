import "dotenv/config";
import { serve } from "@hono/node-server";
import { trpcServer } from "@hono/trpc-server";
import { LOCAL_API_PORT } from "@buy-a-bit/shared";
import { Hono } from "hono";
import { cors } from "hono/cors";

import { auth } from "./auth.js";
import { runMigrations } from "./db/migrate.js";
import { createContext } from "./trpc/context.js";
import { appRouter } from "./trpc/router.js";
import { pinchWebhook } from "./webhooks/pinch.js";

async function main() {
  await runMigrations();

  if (!process.env.BETTER_AUTH_SECRET) {
    throw new Error("BETTER_AUTH_SECRET is not set");
  }

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
      maxAge: 600,
    }),
  );

  app.get("/health", (c) => c.json({ ok: true }));

  app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

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
}

main().catch((err) => {
  console.error("API failed to start:", err);
  process.exit(1);
});

export type { AppRouter } from "./trpc/router.js";
