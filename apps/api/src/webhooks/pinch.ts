import { Hono } from "hono";

/**
 * POST /webhooks/pinch — Day 2.
 * Raw body for signature verify; update orders.status from payment events.
 */
export const pinchWebhook = new Hono().post("/", async (c) => {
  void c;
  return c.json({ ok: false, message: "Webhook handler not implemented" }, 501);
});
