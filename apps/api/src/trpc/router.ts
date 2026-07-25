import { merchantRouter } from "./routers/merchant.js";
import { orderRouter } from "./routers/order.js";
import { paymentRouter } from "./routers/payment.js";
import { productRouter } from "./routers/product.js";
import { router } from "./trpc.js";

export const appRouter = router({
  merchant: merchantRouter,
  product: productRouter,
  order: orderRouter,
  payment: paymentRouter,
});

export type AppRouter = typeof appRouter;
