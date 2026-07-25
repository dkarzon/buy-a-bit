/**
 * Per-customer, per-merchant Pinch payer + vaulted source helpers.
 * Stores Pinch references and display metadata only — never PAN/CVC.
 */
import { and, eq } from "drizzle-orm";

import type { db as DbClient } from "../db/index.js";
import { customerPayers } from "../db/schema.js";
import type { PinchClient } from "./pinch.js";
import { parsePinchExpiry } from "./pinch.js";

export async function findCustomerPayer(
  db: typeof DbClient,
  userId: string,
  merchantId: string,
) {
  return (
    (await db.query.customerPayers.findFirst({
      where: and(
        eq(customerPayers.userId, userId),
        eq(customerPayers.merchantId, merchantId),
      ),
    })) ?? null
  );
}

/** Get or create the customer's per-merchant Pinch payer row (race-safe). */
export async function getOrCreateCustomerPayer(
  db: typeof DbClient,
  pinch: PinchClient,
  input: {
    userId: string;
    merchantId: string;
    firstName: string;
    lastName?: string;
    emailAddress: string;
    mobileNumber?: string;
  },
) {
  const existing = await findCustomerPayer(db, input.userId, input.merchantId);
  if (existing) return existing;

  const payer = await pinch.createPayer({
    firstName: input.firstName,
    lastName: input.lastName,
    emailAddress: input.emailAddress,
    mobileNumber: input.mobileNumber,
  });

  const [created] = await db
    .insert(customerPayers)
    .values({
      userId: input.userId,
      merchantId: input.merchantId,
      pinchPayerId: payer.id,
    })
    .onConflictDoNothing()
    .returning();

  if (created) return created;

  const winner = await findCustomerPayer(db, input.userId, input.merchantId);
  if (!winner) {
    throw new Error("Failed to persist customer payer");
  }
  return winner;
}

/**
 * Vault a CaptureJS token as the customer's one card for this merchant.
 * Replaces any existing Pinch source on the payer.
 */
export async function vaultCustomerCard(
  db: typeof DbClient,
  pinch: PinchClient,
  input: {
    userId: string;
    merchantId: string;
    firstName: string;
    lastName?: string;
    emailAddress: string;
    mobileNumber?: string;
    creditCardToken: string;
  },
) {
  const saved = await getOrCreateCustomerPayer(db, pinch, input);

  if (saved.pinchSourceId) {
    await pinch.deletePaymentSource(saved.pinchPayerId, saved.pinchSourceId);
  }

  const source = await pinch.createPaymentSource({
    payerId: saved.pinchPayerId,
    creditCardToken: input.creditCardToken,
  });
  const expiry = parsePinchExpiry(source.expiryDate);

  const [updated] = await db
    .update(customerPayers)
    .set({
      pinchSourceId: source.id,
      cardScheme: source.cardScheme,
      cardLast4: source.displayCardNumber,
      cardExpiryMonth: expiry.month,
      cardExpiryYear: expiry.year,
      cardHolderName: source.cardHolderName,
      cardSavedAt: new Date(),
    })
    .where(eq(customerPayers.id, saved.id))
    .returning();

  if (!updated) {
    throw new Error("Failed to persist vaulted card");
  }

  return updated;
}
