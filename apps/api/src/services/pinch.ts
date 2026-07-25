/**
 * Pinch REST client — merchant-scoped via pinchClientForMerchant.
 * CaptureJS tokenisation (browser) + createPayer / createRealtimePayment / webhooks.
 * Do not implement Payment Links for MVP.
 */
export const pinchClient = {
  createPayer: async (_args: unknown) => {
    throw new Error("Pinch createPayer not implemented");
  },
  createRealtimePayment: async (_args: unknown) => {
    throw new Error("Pinch createRealtimePayment not implemented");
  },
  getPayment: async (_paymentId: string) => {
    throw new Error("Pinch getPayment not implemented");
  },
  createManagedMerchant: async (_args: unknown) => {
    throw new Error("Pinch createManagedMerchant not implemented");
  },
  verifyWebhookSignature: (_rawBody: string, _headers: Headers) => {
    throw new Error("Pinch webhook verify not implemented");
  },
};
