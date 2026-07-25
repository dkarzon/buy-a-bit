/**
 * Pinch REST client — merchant-scoped via pinchClientForMerchant.
 * CaptureJS tokenisation (browser) + createPayer / createRealtimePayment / webhooks.
 * Do not implement Payment Links for MVP.
 */
import type { merchants } from "../db/schema.js";

import { decryptSecret } from "./credentials.js";

type Merchant = typeof merchants.$inferSelect;

type PinchAuth =
  | { mode: "managed"; pinchMerchantId: string }
  | { mode: "byok"; applicationId: string; secretKey: string };

export type CreatePayerInput = {
  firstName: string;
  lastName?: string;
  emailAddress: string;
  mobileNumber?: string;
};

export type CreatePayerResult = {
  id: string;
};

export type CreateRealtimePaymentInput = {
  payerId: string;
  amountCents: number;
  creditCardToken: string;
  description?: string;
  metadata?: Record<string, string>;
  /** Replay protection — same nonce returns the existing payment */
  nonce?: string;
};

export type PinchPaymentStatus =
  | "scheduled"
  | "processing"
  | "approved"
  | "dishonoured"
  | "settled"
  | "cancelled"
  | string;

export type CreateRealtimePaymentResult = {
  id: string;
  status: PinchPaymentStatus;
  amount: number;
  payerId: string | null;
  dishonour: unknown | null;
};

export type PinchClient = {
  createPayer: (input: CreatePayerInput) => Promise<CreatePayerResult>;
  createRealtimePayment: (
    input: CreateRealtimePaymentInput,
  ) => Promise<CreateRealtimePaymentResult>;
  getPayment: (paymentId: string) => Promise<CreateRealtimePaymentResult>;
  createManagedMerchant: (body: unknown) => Promise<unknown>;
};

type TokenCacheEntry = {
  accessToken: string;
  expiresAtMs: number;
};

const tokenCache = new Map<string, TokenCacheEntry>();

function pinchApiBaseUrl(): string {
  return (
    process.env.PINCH_API_BASE_URL ?? "https://api.getpinch.com.au/test"
  ).replace(/\/$/, "");
}

function pinchAuthUrl(): string {
  return (
    process.env.PINCH_AUTH_URL ?? "https://auth.getpinch.com.au/connect/token"
  );
}

/** True when charging against the live Pinch environment. */
export function isPinchLiveMode(): boolean {
  return pinchApiBaseUrl().includes("/live");
}

async function getAccessToken(
  applicationId: string,
  secretKey: string,
): Promise<string> {
  const cacheKey = applicationId;
  const cached = tokenCache.get(cacheKey);
  // Refresh 60s early to avoid edge expiry mid-request
  if (cached && cached.expiresAtMs > Date.now() + 60_000) {
    return cached.accessToken;
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: applicationId,
    client_secret: secretKey,
  });

  const res = await fetch(pinchAuthUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Pinch auth failed (${res.status}): ${text || res.statusText}`,
    );
  }

  const json = (await res.json()) as {
    access_token: string;
    expires_in?: number;
  };

  const expiresInSec = json.expires_in ?? 3600;
  tokenCache.set(cacheKey, {
    accessToken: json.access_token,
    expiresAtMs: Date.now() + expiresInSec * 1000,
  });

  return json.access_token;
}

function platformCredentials(): { applicationId: string; secretKey: string } {
  const applicationId = process.env.PINCH_APPLICATION_ID;
  const secretKey = process.env.PINCH_SECRET_KEY;
  if (!applicationId || !secretKey) {
    throw new Error(
      "PINCH_APPLICATION_ID and PINCH_SECRET_KEY must be set for managed merchants",
    );
  }
  return { applicationId, secretKey };
}

async function pinchFetch(
  auth: PinchAuth,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const creds =
    auth.mode === "managed"
      ? platformCredentials()
      : { applicationId: auth.applicationId, secretKey: auth.secretKey };

  const accessToken = await getAccessToken(creds.applicationId, creds.secretKey);

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);
  headers.set("pinch-version", "2020.1");
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }
  if (auth.mode === "managed") {
    headers.set("Current-Merchant", auth.pinchMerchantId);
  }

  return fetch(`${pinchApiBaseUrl()}${path}`, {
    ...init,
    headers,
  });
}

async function readPinchError(res: Response): Promise<string> {
  const text = await res.text().catch(() => "");
  if (!text) return res.statusText;
  try {
    const json = JSON.parse(text) as unknown;
    return typeof json === "string" ? json : JSON.stringify(json);
  } catch {
    return text;
  }
}

function createPinchClient(auth: PinchAuth): PinchClient {
  return {
    async createPayer(input) {
      const res = await pinchFetch(auth, "/payers", {
        method: "POST",
        body: JSON.stringify({
          firstName: input.firstName,
          lastName: input.lastName,
          emailAddress: input.emailAddress,
          mobileNumber: input.mobileNumber,
        }),
      });

      if (!res.ok) {
        throw new Error(
          `Pinch createPayer failed (${res.status}): ${await readPinchError(res)}`,
        );
      }

      const json = (await res.json()) as { id: string };
      return { id: json.id };
    },

    async createRealtimePayment(input) {
      const res = await pinchFetch(auth, "/payments/realtime", {
        method: "POST",
        body: JSON.stringify({
          payerId: input.payerId,
          amount: input.amountCents,
          description: input.description,
          // OpenAPI: `token`; credit-card guide also documents creditCardToken
          token: input.creditCardToken,
          creditCardToken: input.creditCardToken,
          metadata: input.metadata
            ? JSON.stringify(input.metadata)
            : undefined,
          nonce: input.nonce,
        }),
      });

      if (!res.ok) {
        throw new Error(
          `Pinch createRealtimePayment failed (${res.status}): ${await readPinchError(res)}`,
        );
      }

      const json = (await res.json()) as {
        id: string;
        status: PinchPaymentStatus;
        amount: number;
        payerId?: string | null;
        dishonour?: unknown | null;
      };

      return {
        id: json.id,
        status: json.status,
        amount: json.amount,
        payerId: json.payerId ?? null,
        dishonour: json.dishonour ?? null,
      };
    },

    async getPayment(paymentId) {
      const res = await pinchFetch(auth, `/payments/${paymentId}`, {
        method: "GET",
      });

      if (!res.ok) {
        throw new Error(
          `Pinch getPayment failed (${res.status}): ${await readPinchError(res)}`,
        );
      }

      const json = (await res.json()) as {
        id: string;
        status: PinchPaymentStatus;
        amount: number;
        payerId?: string | null;
        dishonour?: unknown | null;
      };

      return {
        id: json.id,
        status: json.status,
        amount: json.amount,
        payerId: json.payerId ?? null,
        dishonour: json.dishonour ?? null,
      };
    },

    async createManagedMerchant(body) {
      // Platform creds only — no Current-Merchant on merchant create
      void auth;
      const creds = platformCredentials();
      const accessToken = await getAccessToken(
        creds.applicationId,
        creds.secretKey,
      );

      const res = await fetch(`${pinchApiBaseUrl()}/merchants`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "pinch-version": "2020.1",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        throw new Error(
          `Pinch createManagedMerchant failed (${res.status}): ${await readPinchError(res)}`,
        );
      }

      return res.json();
    },
  };
}

export function pinchClientForMerchant(merchant: Merchant): PinchClient {
  if (merchant.pinchConnectionMode === "managed") {
    if (!merchant.pinchMerchantId) {
      throw new Error("Managed merchant is missing pinchMerchantId");
    }
    return createPinchClient({
      mode: "managed",
      pinchMerchantId: merchant.pinchMerchantId,
    });
  }

  if (merchant.pinchConnectionMode === "byok") {
    if (!merchant.pinchApplicationId || !merchant.pinchSecretKeyEncrypted) {
      throw new Error("BYOK merchant is missing Pinch Application credentials");
    }
    return createPinchClient({
      mode: "byok",
      applicationId: merchant.pinchApplicationId,
      secretKey: decryptSecret(merchant.pinchSecretKeyEncrypted),
    });
  }

  throw new Error("Merchant has no Pinch connection configured");
}

/** Safe for browser — never returns Application secrets */
export function publishableKeyForMerchant(merchant: Merchant): string {
  if (merchant.pinchConnectionMode === "managed") {
    const key = process.env.PINCH_PUBLISHABLE_KEY;
    if (!key) {
      throw new Error("PINCH_PUBLISHABLE_KEY is not set");
    }
    return key;
  }
  if (merchant.pinchConnectionMode === "byok") {
    if (!merchant.pinchPublishableKey) {
      throw new Error("BYOK merchant is missing pinchPublishableKey");
    }
    return merchant.pinchPublishableKey;
  }
  throw new Error("Merchant has no Pinch connection configured");
}

/** Map Pinch payment status → our order status for immediate UX. */
export function orderStatusFromPinchPayment(
  payment: Pick<CreateRealtimePaymentResult, "status" | "dishonour">,
): "paid" | "failed" | "pending" {
  if (payment.dishonour) return "failed";
  switch (payment.status) {
    case "approved":
    case "settled":
      return "paid";
    case "dishonoured":
    case "cancelled":
      return "failed";
    default:
      return "pending";
  }
}

/** Split "Jane Smith" → first/last for Pinch payer fields. */
export function splitCustomerName(fullName: string): {
  firstName: string;
  lastName: string;
} {
  const trimmed = fullName.trim();
  const space = trimmed.indexOf(" ");
  if (space === -1) {
    return { firstName: trimmed || "Customer", lastName: "" };
  }
  return {
    firstName: trimmed.slice(0, space),
    lastName: trimmed.slice(space + 1).trim(),
  };
}
