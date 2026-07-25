/** Order line helpers — summaries and quantity merges for multi-item orders. */

export type OrderLineRef = {
  productId: string;
  quantity: number;
};

export type OrderLineSnapshot = {
  productName: string;
  quantity: number;
  lineTotalCents: number;
};

/** Merge duplicate productIds by summing quantities. */
export function mergeOrderLineRefs(items: OrderLineRef[]): OrderLineRef[] {
  const quantities = new Map<string, number>();
  for (const item of items) {
    quantities.set(
      item.productId,
      (quantities.get(item.productId) ?? 0) + item.quantity,
    );
  }
  return [...quantities.entries()].map(([productId, quantity]) => ({
    productId,
    quantity,
  }));
}

/** Single-line label: "Widget" or "Widget + 2 more". */
export function summarizeOrderItems(
  items: Pick<OrderLineSnapshot, "productName">[],
): string {
  if (items.length === 0) return "Order";
  const first = items[0]!.productName;
  if (items.length === 1) return first;
  return `${first} + ${items.length - 1} more`;
}

export function toPaymentLines(items: OrderLineSnapshot[]): OrderLineSnapshot[] {
  return items.map((item) => ({
    productName: item.productName,
    quantity: item.quantity,
    lineTotalCents: item.lineTotalCents,
  }));
}
