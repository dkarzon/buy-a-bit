/**
 * Pinch REST client — Day 1.
 * createPaymentLink / getPayment / verifyWebhookSignature
 */
export const pinchClient = {
  createPaymentLink: async (_args: unknown) => {
    throw new Error("Pinch client not implemented");
  },
  getPayment: async (_paymentId: string) => {
    throw new Error("Pinch client not implemented");
  },
  verifyWebhookSignature: (_rawBody: string, _headers: Headers) => {
    throw new Error("Pinch webhook verify not implemented");
  },
};
