# Pinch Buy-a-bit — Tech Stack Plan

Stack choices for the hackathon build, aligned with [idea1-buy-a-bit.md](./idea1-buy-a-bit.md).

---

## Overview

| Layer | Choice | Why |
|-------|--------|-----|
| Monorepo | **pnpm workspaces** | One repo, shared types, fast installs |
| Frontend | **React 19 + TypeScript + Tailwind CSS 4 + Vite** | Fast dev server, simple SPA; landing pages don't need SSR for NFC/QR |
| API | **Hono + tRPC** | Lightweight HTTP layer; end-to-end type safety with the frontend |
| Validation | **Zod** | Shared schemas between tRPC procedures and forms |
| Database | **PostgreSQL + Drizzle ORM** | TypeScript-native, minimal boilerplate, excellent inference |
| Migrations | **Drizzle Kit** | SQL migrations generated from schema; easy push/pull in dev |
| Auth | **Better Auth** | Merchant sessions, email/password, and Drizzle integration out of the box (no Pinch user OAuth — Pinch has no end-user login product) |
| Payments | **Pinch CaptureJS + realtime API + webhooks** | Custom payment page; PCI off our servers |
| QR codes | **`qrcode` (server-side PNG/SVG)** | Generated when a product is created |
| File storage (images) | **Uploadthing** or **URL-only for MVP** | Skip S3 setup on day 1 if needed |
| Deployment | **Railway** (API + Postgres) + **Cloudflare Pages** or **Vercel** (frontend) | Minimal config; Postgres included on Railway |

---

## Repository Structure

```
buy-a-bit/
├── apps/
│   ├── web/                 # Vite + React + Tailwind + tRPC client
│   │   ├── src/
│   │   │   ├── pages/       # Landing, payment complete, admin portal
│   │   │   ├── pages/admin/ # Stretch: products, orders, settings
│   │   │   ├── components/
│   │   │   ├── components/admin/  # Stretch: AdminLayout, ProductTable, etc.
│   │   │   ├── lib/trpc.ts
│   │   │   ├── lib/auth-client.ts  # createAuthClient (better-auth/react)
│   │   │   └── main.tsx
│   │   └── vite.config.ts
│   └── api/                 # Hono + tRPC server
│       ├── src/
│       │   ├── index.ts     # Hono app entry
│       │   ├── auth.ts      # betterAuth instance + Drizzle adapter
│       │   ├── trpc/        # Routers: merchant, product, order, payment
│       │   ├── db/          # Drizzle client + schema (app + auth tables)
│       │   ├── services/    # Pinch client, QR generator, webhook handler
│       │   └── webhooks/    # POST /webhooks/pinch (raw body for signature verify)
│       └── drizzle.config.ts
├── packages/
│   └── shared/              # Shared Zod schemas + constants (optional but useful)
├── package.json
├── pnpm-workspace.yaml
└── .env.example
```

---

## Frontend

### Core packages

```json
{
  "dependencies": {
    "react": "^19",
    "react-dom": "^19",
    "react-router-dom": "^7",
    "@tanstack/react-query": "^5",
    "@trpc/client": "^11",
    "@trpc/react-query": "^11",
    "better-auth": "^1",
    "zod": "^3"
  },
  "devDependencies": {
    "typescript": "^5",
    "vite": "^6",
    "@vitejs/plugin-react": "^4",
    "tailwindcss": "^4",
    "@tailwindcss/vite": "^4"
  }
}
```

### Routes (React Router)

| Route | Purpose | Auth |
|-------|---------|------|
| `/login` | Merchant sign-in (email/password) | Public |
| `/onboarding` | First-time setup: business name + Pinch mode (`managed` \| `byok`) | Authenticated |
| `/dashboard` | Merchant home, order list *(MVP)* | Merchant |
| `/products/new` | Create product *(MVP)* | Merchant |
| `/products/:id` | Edit product, download QR *(MVP)* | Merchant |
| `/admin/*` | Full merchant admin portal *(stretch — see below)* | Merchant |
| `/p/:productId` | Customer product landing page (contact → create order) | Public |
| `/pay/:orderId` | Custom payment page (CaptureJS card form) | Public (order id) |
| `/s/:storeSlug` | Customer store catalog page *(stretch)* | Public |
| `/payment/complete` | Post-charge confirmation + status | Public (session id in query) |

### UI approach

- **Tailwind** for layout and styling; no component library required for hackathon speed.
- Optional: **shadcn/ui** if you want polished forms/buttons without design time.
- **TanStack Query** via tRPC handles caching, loading states, and refetch after payment.

### Auth client (Better Auth)

```typescript
// apps/web/src/lib/auth-client.ts
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_API_URL, // e.g. http://localhost:3001
});
```

- **`authClient.useSession()`** — reactive session in dashboard routes; redirect to `/login` when null.
- **`authClient.signIn.email` / `signUp.email`** — merchant email/password auth.
- **`authClient.signOut()`** — clears session cookie via Better Auth API.
- Import from **`better-auth/react`** (not `better-auth/client`) so `useSession` is a proper React hook.

### tRPC client setup

- Single `trpc` client pointing at `VITE_API_URL` (e.g. `http://localhost:3001/trpc`).
- Credentials: `fetch` with `credentials: 'include'` so Better Auth session cookies flow into tRPC context (Hono CORS configured accordingly).

---

## Backend

### Core packages

```json
{
  "dependencies": {
    "hono": "^4",
    "@hono/trpc-server": "^0.4",
    "@trpc/server": "^11",
    "drizzle-orm": "^0.38",
    "postgres": "^3",
    "zod": "^3",
    "qrcode": "^1",
    "@hono/node-server": "^1",
    "better-auth": "^1",
    "@better-auth/drizzle-adapter": "^1"
  },
  "devDependencies": {
    "drizzle-kit": "^0.30",
    "tsx": "^4",
    "typescript": "^5"
  }
}
```

### Hono app layout

```
Hono app
├── /api/auth/*      → Better Auth handler (sign-in, sign-up, session)
├── /trpc/*          → tRPC handler (merchant, product, order routers)
├── /webhooks/pinch  → Raw POST; verify signature; update order status
├── /health          → Health check for deploy
└── CORS middleware  → Allow web origin + credentials (before auth routes)
```

Better Auth mounts on `/api/auth/*`:

```typescript
app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));
```

Global session middleware loads the Better Auth session once per request and exposes it to tRPC:

```typescript
app.use("*", async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  c.set("user", session?.user ?? null);
  c.set("session", session?.session ?? null);
  await next();
});
```

### tRPC routers (MVP)

| Router | Procedures | Notes |
|--------|------------|-------|
| `merchant` | `me`, `create`, `updateProfile`, `connectPinchByok`, `uploadComplianceDoc` | Protected; `create` branches managed vs BYOK |
| `product` | `list`, `create`, `update`, `delete`, `getBySlug` | `getBySlug` public for landing page |
| `order` | `create`, `getBySession`, `listForMerchant` | `create` = pending order from landing contact form |
| `payment` | `getCheckoutContext`, `charge`, `getStatus` | Public; CaptureJS token → realtime charge |

**Context:** `{ db, user, session, merchant }` injected per request. `merchant` is loaded from `merchants.userId = session.user.id` when authenticated. Pinch calls use `pinchClientForMerchant(merchant)` — never a single shared client for all tenants.

**Middleware:** `protectedProcedure` requires a valid Better Auth session + linked merchant row; public procedures for landing/checkout/charge.

### Pinch integration (service layer)

Keep Pinch HTTP calls out of tRPC handlers. Resolve credentials **per merchant**, not a single global client:

```typescript
// apps/api/src/services/pinch.ts

type PinchAuth =
  | { mode: "managed"; pinchMerchantId: string } // platform env creds + Current-Merchant
  | { mode: "byok"; applicationId: string; secretKey: string };

async function getAccessToken(applicationId: string, secretKey: string): Promise<string>;
// POST https://auth.getpinch.com.au/connect/token (client_credentials); cache ~1h

function createPinchClient(auth: PinchAuth) {
  return {
    createManagedMerchant(body),      // managed onboarding only; no Current-Merchant
    createPayer(input),               // POST /payers
    createRealtimePayment(input),     // POST /payments/realtime
    getPayment(paymentId),            // GET /payments/{id}
    createWebhook(url, eventTypes),
    uploadComplianceDocument(...),   // managed; requires Current-Merchant
  };
}

export function pinchClientForMerchant(merchant: Merchant) {
  if (merchant.pinchConnectionMode === "managed") {
    return createPinchClient({
      mode: "managed",
      pinchMerchantId: merchant.pinchMerchantId!,
    });
  }
  return createPinchClient({
    mode: "byok",
    applicationId: decrypt(merchant.pinchApplicationId!),
    secretKey: decrypt(merchant.pinchSecretKeyEncrypted!),
  });
}

/** Safe for browser — never returns Application secrets */
export function publishableKeyForMerchant(merchant: Merchant): string {
  if (merchant.pinchConnectionMode === "managed") {
    return process.env.PINCH_PUBLISHABLE_KEY!;
  }
  return merchant.pinchPublishableKey!;
}
```

**Request headers (server)**

| Mode | `Authorization` | `Current-Merchant` |
|------|-----------------|--------------------|
| Managed | Bearer from **platform** `PINCH_APPLICATION_ID` / `PINCH_SECRET_KEY` | `mch_…` from `merchants.pinchMerchantId` |
| BYOK | Bearer from **merchant** Application ID / Secret | omit |

See [Managed Merchants Guide](https://docs.getpinch.com.au/docs/managed-merchants) — impersonation is always platform credentials + `Current-Merchant`.

**Custom payment page flow** ([CaptureJS](https://docs.getpinch.com.au/docs/capturejs-tokenisation), [Credit card payments](https://docs.getpinch.com.au/docs/credit-card-payments)):

```
/p/:slug  →  order.create (pending)
     →  /pay/:orderId
           payment.getCheckoutContext → { publishableKey, amountCents, … }
           CaptureJS createToken(card) → creditCardToken
           payment.charge({ orderId, creditCardToken })
             → createPayer + POST /payments/realtime
     →  /payment/complete?session={orderId}
```

**Frontend CaptureJS**

```html
<script src="https://cdn.getpinch.com.au/capturejs/pinch.capture.v2.js"
  integrity="sha384-…" crossorigin="anonymous"></script>
```

```typescript
const capture = Pinch.Capture({ publishableKey }); // from getCheckoutContext
const { token } = await capture.createToken({
  sourceType: "credit-card",
  cardNumber, expiryMonth, expiryYear, cvc, cardHolderName,
});
await trpc.payment.charge.mutate({ orderId, creditCardToken: token });
```

**Service functions**

- `createManagedMerchant(input)` → `POST /merchants/managed`
- `createPayer(input)` → `POST /payers`
- `createRealtimePayment({ payerId, amountCents, creditCardToken, metadata, description })` → `POST /payments/realtime`
- `getPayment(paymentId)` → `GET /payments/{id}`
- `subscribeMerchantWebhooks(merchant)` → `POST /webhooks`
- `verifyWebhookSignature(rawBody, headers, secret?)` → webhook security

**Do not implement** Payment Links (`POST /payment-links`) for MVP.

Metadata attached to every realtime payment:

```json
{
  "orderId": "...",
  "productId": "...",
  "merchantId": "...",
  "customerName": "...",
  "customerEmail": "..."
}
```

**Webhook events:** `realtime-payment` (and related) → update `orders.status`, store `paymentId`.  
Managed also: `compliance-updated` → update `pinchComplianceStatus` / `pinchMerchantStatus`.

Realtime API response drives immediate UX; webhooks reconcile / confirm.

**`payment.charge`:** load order → items → merchant → `pinchClientForMerchant(merchant)` → payer + realtime charge. Amount always from **`orders.totalCents`** (snapshotted at create from line items). Never trust client amount. Never accept raw card fields on the server.

**Live-payment gate (managed):** reject live charge if `pinchMerchantStatus !== "active"` (allow test/sandbox for demos).

---

## Database — PostgreSQL + Drizzle

### Why Drizzle

- Schema is TypeScript — same language as the rest of the stack.
- Queries are typed end-to-end; no code generation step beyond migrations.
- **Drizzle Kit** generates and runs SQL migrations; `drizzle-kit push` is fine for local hackathon iteration.
- Lighter than Prisma; pairs well with tRPC inference.

### Schema (maps to product concept)

Better Auth owns auth tables (`user`, `session`, `account`, `verification`). Generate them with the CLI and merge into the same Drizzle schema file:

```bash
pnpm --filter api exec @better-auth/cli generate
```

App tables link to Better Auth via `merchants.userId`:

```typescript
// apps/api/src/db/schema.ts

// --- Better Auth (generated via CLI) ---
user, session, account, verification

// --- App tables ---
merchants
  id             uuid PK default gen_random_uuid()
  userId         text FK → user.id UNIQUE NOT NULL
  businessName   text NOT NULL
  // Pinch connection — see idea1 "Pinch Connection Modes"
  pinchConnectionMode enum: managed | byok
  pinchMerchantId     text                    // Pinch mch_… (required when managed)
  pinchApplicationId  text                    // BYOK Application ID (nullable when managed)
  pinchSecretKeyEncrypted text                // BYOK only; encrypt at rest
  pinchPublishableKey text                    // BYOK pk_…; managed uses PINCH_PUBLISHABLE_KEY env
  pinchWebhookSecretEncrypted text            // optional; BYOK webhook verify
  pinchComplianceStatus enum: pending | in_review | approved | rejected | null
  pinchMerchantStatus   text                  // e.g. unverified | active
  storeSlug      text UNIQUE             // stretch: public store URL
  description    text                   // stretch
  logoUrl        text                   // stretch
  isStoreOpen    boolean DEFAULT true    // stretch: master availability switch
  createdAt      timestamptz

products
  id            uuid PK
  merchantId    uuid FK → merchants.id
  slug          text UNIQUE NOT NULL   // used in /p/:slug
  name          text NOT NULL
  priceCents    integer NOT NULL       // store money as cents
  description   text
  imageUrl      text
  stockCount    integer                // nullable = unlimited
  isAvailable   boolean DEFAULT true   // stretch: merchant catalog toggle
  sortOrder     integer DEFAULT 0      // stretch: store catalog ordering
  createdAt     timestamptz

orders
  id              uuid PK
  merchantId      uuid FK → merchants.id
  customerName    text NOT NULL
  customerEmail   text NOT NULL
  customerPhone   text
  totalCents      integer NOT NULL      // snapshotted sum of line totals at create
  payerId         text                 // Pinch pyr_… set at charge
  paymentId       text                 // Pinch pmt_…
  status          enum: pending | paid | failed
  createdAt       timestamptz
  paidAt          timestamptz

order_items
  id              uuid PK
  orderId         uuid FK → orders.id ON DELETE CASCADE
  productId       uuid FK → products.id (restrict)  // reference only; money from snapshots
  productName     text NOT NULL        // snapshotted at create
  unitPriceCents  integer NOT NULL     // snapshotted at create
  quantity        integer NOT NULL
  lineTotalCents  integer NOT NULL     // unitPriceCents * quantity
```

### Migration workflow

1. **Generate Better Auth schema** with `@better-auth/cli generate` and merge into `apps/api/src/db/schema.ts`.
2. **Define app schema** (merchants, products, orders, order_items) in the same file.
3. **Generate migration:**
   ```bash
   pnpm --filter api db:generate   # drizzle-kit generate
   ```
   Creates timestamped SQL files in `apps/api/drizzle/`.
4. **Apply locally:**
   ```bash
   pnpm --filter api db:migrate    # drizzle-kit migrate
   ```
5. **Hackathon shortcut (dev only):**
   ```bash
   pnpm --filter api db:push       # drizzle-kit push — sync schema without migration files
   ```
   Use `push` on day 1 for speed; switch to `generate` + `migrate` before any shared/deployed DB.

### Local Postgres

- **Docker Compose** (recommended):
  ```yaml
  services:
    postgres:
      image: postgres:16
      ports: ["5432:5432"]
      environment:
        POSTGRES_USER: buy_a_bit
        POSTGRES_PASSWORD: buy_a_bit
        POSTGRES_DB: buy_a_bit
  ```
- Connection string: `DATABASE_URL=postgres://buy_a_bit:buy_a_bit@localhost:5432/buy_a_bit`

### package.json scripts (api)

```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio"
  }
}
```

`drizzle-kit studio` gives a quick GUI to inspect rows during the demo.

---

## Auth — Better Auth

Better Auth handles all sessions and cookies with a single `user` table. Merchants authenticate with email/password and are identified by a linked `merchants` row; customers may sign in with the same mechanism (no `merchants` row needed) for order history and saved cards, or stay anonymous on landing pages. Pinch does **not** offer OAuth/social login for end users (or merchants) — only OAuth2 **client credentials** for API Application auth (see Pinch service layer).

### Server config

```typescript
// apps/api/src/auth.ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { db } from "./db";
import * as schema from "./db/schema";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,       // http://localhost:3001
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: [process.env.WEB_URL!],     // http://localhost:5173
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
  },
});

export type Session = typeof auth.$Infer.Session;
```

### Merchant sign-in flow

1. Frontend calls `authClient.signIn.email` (or `signUp.email`).
2. Better Auth sets an httpOnly session cookie.
3. On first login, redirect to `/onboarding` if no `merchants` row exists.
4. Onboarding collects `businessName` **and** Pinch connection choice:

**Managed path**
1. Collect company/contact (+ bank fields when going live).
2. `merchant.create` → `POST /merchants/managed` with platform credentials.
3. Save `pinchConnectionMode = managed`, `pinchMerchantId = mch_…`, compliance fields `pending` / `unverified`.
4. `subscribeMerchantWebhooks` with `Current-Merchant`.
5. Compliance docs: upload API or manual Glassbox (hackathon).

**BYOK path**
1. Collect Application ID + Secret Key + Publishable Key (`pk_…`).
2. Validate via token endpoint; encrypt and store secrets; store publishable key in plaintext (safe for browser).
3. Save `pinchConnectionMode = byok`; optionally store `pinchMerchantId` if known.
4. Register or ask merchant to point webhooks at `{API_URL}/webhooks/pinch`.

5. tRPC `protectedProcedure` reads session via `auth.api.getSession`, loads merchant by `userId`.

**Hackathon fallback:** email/password + **BYOK paste keys** is the fastest path if Managed Merchants is not enabled on the master account. Prefer managed when available so demos need only platform env credentials.

Replace the older “single `PINCH_API_KEY` for everyone” assumption: platform keys are only for **managed** impersonation; BYOK merchants never share those keys.

### Frontend route protection

```tsx
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = authClient.useSession();
  if (isPending) return <Spinner />;
  if (!session) return <Navigate to="/login" />;
  return children;
}
```

Wrap `/dashboard`, `/products/*` in `ProtectedRoute`.

### tRPC integration

```typescript
// apps/api/src/trpc/context.ts
export const createContext = async (opts: { hono: Context }) => {
  const session = await auth.api.getSession({ headers: opts.hono.req.raw.headers });
  const merchant = session?.user
    ? await db.query.merchants.findFirst({ where: eq(merchants.userId, session.user.id) })
    : null;
  // Do not inject a single pinchClient here — charge resolves via pinchClientForMerchant(order.merchant)
  return { db, session, user: session?.user ?? null, merchant };
};
```

### Customer auth

Optional — guest checkout stays the default. The checkout form collects name/email; both are snapshotted on the `orders` row regardless of sign-in state. There is **no Pinch OAuth/login** (Pinch does not provide end-user login).

Signed-in customers (same Better Auth `user` table, `/account/login`) additionally get:

- `orders.userId` set on orders created or paid while signed in (a signed-in payment claims a guest order for that user).
- Order history across merchants via `account.listOrders` (`/account`).
- One saved card per merchant: `customer_payers` holds a Pinch payer per `(userId, merchantId)` plus one vaulted payment source (`POST /payers/{id}/sources`) and display metadata (scheme/last4/expiry). Charging the saved card is a realtime payment **without** a token — Pinch uses the payer's stored source. Saving a new card deletes the old source first, so a payer never holds two.
- Saved-card charges and card-saving require the session user to own (or claim) the order — the order id alone only authorises a fresh-token charge.

The web routes are `/account` (orders), `/account/payment-methods`, guarded by `CustomerRoute` (session only, no merchant requirement).

---

## Cross-cutting concerns

### Environment variables

```bash
# apps/api
DATABASE_URL=
BETTER_AUTH_SECRET=          # random 32+ char secret
BETTER_AUTH_URL=http://localhost:3001
# Platform Pinch Application (Managed Merchants + realtime charges)
PINCH_APPLICATION_ID=        # OAuth client_id — not Merchant ID
PINCH_SECRET_KEY=
PINCH_PUBLISHABLE_KEY=       # pk_test_… / pk_live_… for CaptureJS (managed merchants)
PINCH_WEBHOOK_SECRET=        # default/platform webhook signing secret
PINCH_API_BASE_URL=https://api.getpinch.com.au/test   # or /live
PINCH_AUTH_URL=https://auth.getpinch.com.au/connect/token
# Optional: encrypt BYOK secrets at rest (AES key, 32 bytes base64)
CREDENTIALS_ENCRYPTION_KEY=
WEB_URL=http://localhost:5173
API_URL=http://localhost:3001

# apps/web
VITE_API_URL=http://localhost:3001
# Prefer serving publishable keys via payment.getCheckoutContext (supports BYOK).
# Do not put Application secrets in VITE_*.
```

**Note:** Prefer `PINCH_APPLICATION_ID` + `PINCH_SECRET_KEY` over a legacy single `PINCH_API_KEY`. Never put Pinch Application secrets in `VITE_*` vars. Publishable keys are client-safe but still prefer API-resolved keys so BYOK works per merchant.

### CORS

Hono CORS: origin = `WEB_URL`, `credentials: true`, methods including OPTIONS.

### Error handling

- tRPC `TRPCError` for business errors (product not found, out of stock).
- Webhook handler returns 200 quickly; log failures for retry.

### QR code generation

- On `product.create`, generate slug + QR PNG (data URL or store in object storage).
- QR encodes `{WEB_URL}/p/{slug}`.
- Return QR as base64 from tRPC for instant dashboard display.

### NFC (optional, day 2)

- **Web NFC API** (`NDEFWriter`) in Chrome Android — write URL from merchant dashboard.
- No backend change; same URL as QR.

---

## Build order (maps to hackathon days)

### Team split (2 people)

| Track | Owner | Owns |
|-------|-------|------|
| **Backend** | Person A | Hono, tRPC routers, Drizzle schema, Better Auth, Pinch service, webhooks, deploy API |
| **Frontend** | Person B | React pages, Tailwind UI, tRPC client, forms, dashboard, deploy web |

**Rule:** agree on tRPC procedure signatures + Zod input schemas in `packages/shared` early, then work in parallel. Frontend can stub/mock until backend catches up.

### Parallel work plan

```mermaid
gantt
    title Hackathon parallel tracks
    dateFormat HH:mm
    axisFormat %H:%M

    section Together
    Monorepo scaffold + shared types     :crit, t0, 00:45, 45m
    E2E smoke test                       :crit, t7, 30m

    section Person A — Backend
    Postgres + Drizzle + Better Auth     :a1, after t0, 90m
    tRPC product + order + Pinch         :a2, after a1, 120m
    Webhooks + payment.getStatus         :a3, after a2, 90m
    Onboarding API (managed / BYOK)      :a4, after a3, 60m
    Deploy API                           :a5, after a4, 45m

    section Person B — Frontend
    Web shell + routing + Tailwind       :b1, after t0, 60m
    Landing page + product form          :b2, after b1, 120m
    Custom payment page (CaptureJS)      :b3, after b2, 60m
    Payment complete + dashboard         :b4, after a3, 90m
    Login + onboarding UI                :b5, after a4, 60m
    NFC button + deploy web              :b6, after b5, 45m
```

#### Phase 0 — Together first (~45 min)

Do this pair-programmed or split sequentially before parallel work starts:

1. Scaffold monorepo (pnpm workspaces, `apps/api`, `apps/web`, `packages/shared`).
2. Add shared Zod schemas for `Product`, `Order`, and tRPC input types.
3. Agree on env var names and local ports (`API :3001`, `WEB :5173`).
4. Person A: `docker compose up` Postgres. Person B: can start Tailwind + router skeleton once repo exists.

Nothing else runs in parallel until **`packages/shared` exports the API contract**.

---

#### Day 1 — Core loop

| Step | Person A (backend) | Person B (frontend) | Parallel? |
|------|-------------------|---------------------|-----------|
| 1 | Postgres + Drizzle schema + `db:push` | Web shell: React Router, Tailwind, layout components | ✅ After Phase 0 |
| 2 | Better Auth on Hono + email/password | tRPC client + `ProtectedRoute` + `/login` page shell | ✅ |
| 3 | `product.create`, `product.getBySlug` + QR generation | `/p/:slug` landing page (mock → wire when ready) | ✅ |
| 4 | `order.create` + `payment.charge` (payer + realtime) | Product create form → calls `product.create` | ⚠️ B needs A's `product.create` first; B can build form UI in parallel |
| 5 | `payment.getCheckoutContext` (publishable key) | Custom `/pay/:orderId` page + CaptureJS | 🔗 Sync: charge input/output shapes |
| 6 | — | Merchant `/products/new` form polish | ✅ While A finishes Pinch |
| 7 | QR base64 in `product.create` response | Display QR on product success / edit page | 🔗 Sync: response includes `qrDataUrl` |

**Day 1 milestone (both):** create product → open landing → pay on custom CaptureJS page (sandbox charge can fail — that's OK).

**Critical path:** `payment.charge` + Pinch realtime service (Person A) blocks the full loop. Person B should not wait idle — build landing + payment form against mocked tRPC, then swap in real calls.

---

#### Day 2 — Complete the demo

| Step | Person A (backend) | Person B (frontend) | Parallel? |
|------|-------------------|---------------------|-----------|
| 1 | Webhook endpoint + order status updates | `/payment/complete` page UI | ✅ |
| 2 | `payment.getStatus` procedure | Wire complete page → poll status + show success/fail | 🔗 Sync after A ships procedure |
| 3 | `product.list`, `order.listForMerchant` | Merchant dashboard (products + orders tables) | ✅ Once list procedures exist |
| 4 | `merchant.create` / onboarding tRPC | `/onboarding` form (business name + managed/BYOK) | ✅ |
| 5 | — | NFC write button on product page (Web NFC API) | ✅ Fully frontend; no backend |
| 6 | Deploy API + register webhook URL | Deploy web + set `VITE_API_URL` | ✅ Split deploy tasks |

**Day 2 milestone (both):** full demo script — login → create product → tap NFC/scan QR → pay → order appears in dashboard.

**Parallel wins on Day 2:**
- Webhooks (A) + payment complete UI (B) — zero overlap.
- Dashboard UI (B) can use mock order data while A builds webhook handler.
- NFC button (B) is independent — good filler while A finishes onboarding API.

---

#### Stretch — Admin portal (if time remains)

| Step | Person A (backend) | Person B (frontend) | Parallel? |
|------|-------------------|---------------------|-----------|
| 1 | Schema: `isAvailable`, `storeSlug`, `sortOrder` + migrate | Init shadcn/ui + `/admin` layout shell | ✅ |
| 2 | `product.setAvailability`, `product.reorder`, `merchant.updateStoreSettings` | Products table + Live toggle | 🔗 B can UI-first with mock toggle |
| 3 | `product.listForStore`, `merchant.getStoreBySlug` (public) | Product edit form (React Hook Form) | ✅ |
| 4 | Availability checks in `getBySlug` + `order.create` / `payment.charge` | Orders table with status filters | ✅ |
| 5 | Store QR generation endpoint (optional) | Store settings page | ✅ |
| 6 | — | `/s/:storeSlug` catalog page (optional) | ✅ After A ships `listForStore` |

**Stretch split tip:** Person B owns the entire admin shell and tables; Person A only adds the new procedures and schema migration. Minimal merge conflicts.

---

### Sync points (don't skip these)

| When | What to align | How |
|------|---------------|-----|
| Phase 0 | tRPC procedure names + input/output types | Merge `packages/shared` before splitting |
| Day 1 midday | `product.create` response shape (includes QR) | Quick call or Slack message |
| Day 1 afternoon | `payment.charge` + `getCheckoutContext` shapes | Shared type in `packages/shared` |
| Day 2 morning | Order status enum + webhook payload mapping | Document in shared constants |
| Day 2 afternoon | Production URLs for CORS + Pinch webhook | Pair on deploy |
| Before judging | Full demo run on a real phone | Together |

### What must stay sequential

These cannot run in parallel — hard dependencies:

1. **Monorepo scaffold** before either track starts meaningful work.
2. **`product.getBySlug`** before landing page can load real data.
3. **`payment.charge`** before custom payment page works end-to-end.
4. **Webhook handler** before dashboard shows live order updates (polling `payment.getStatus` is a temporary fallback).
5. **Production deploy** before phone demo (unless using ngrok for local demo).

### Suggested hourly schedule (2-day hackathon)

| Time | Person A | Person B |
|------|----------|----------|
| **Day 1, H1** | Phase 0 together → Postgres + schema + auth | Phase 0 together → web shell + routing |
| **Day 1, H2–4** | tRPC product + order + Pinch service | Landing page + product form |
| **Day 1, H5–6** | QR in create + fix integration bugs | Checkout UX + wire tRPC calls |
| **Day 1, H7–8** | Help B debug CORS/cookies | Polish landing page + demo data |
| **Day 2, H1–2** | Webhooks + getStatus | Payment complete page |
| **Day 2, H3–4** | List procedures + onboarding API | Dashboard + onboarding UI |
| **Day 2, H5** | Deploy API | Deploy web + NFC button |
| **Day 2, H6–8** | E2E test together → fix → rehearse demo | E2E test together → fix → rehearse demo |

---

### Day 1 — Core loop (reference checklist)

1. Scaffold monorepo (pnpm, Vite web, Hono api).
2. Docker Postgres + Better Auth schema (CLI) + app schema + `db:push`.
3. Better Auth on Hono (`/api/auth/*`) + email/password sign-up for dev.
4. tRPC: `product.create`, `product.getBySlug`, `order.create`, `payment.charge`.
5. CaptureJS payment page + realtime charge via `pinchClientForMerchant` (managed `Current-Merchant` or BYOK).
6. Landing page UI + merchant product form.
7. QR generation on create.
8. Onboarding: managed create **or** BYOK key paste + validate.

### Day 2 — Complete the demo (reference checklist)

1. Webhook endpoint + order status updates.
2. `/payment/complete` + `payment.getStatus`.
3. Merchant dashboard (products list + orders).
4. Merchant onboarding: managed merchant create **or** BYOK keys; link `merchants` row to auth user.
5. NFC write button (optional).
6. Deploy + end-to-end test on phone.

---

## Stretch goal — Merchant admin portal

After the core tap-to-pay loop works, evolve the minimal merchant dashboard into a **store admin portal**: a logged-in area where merchants manage which products are live in their store, how they appear, and what customers can buy.

### MVP vs stretch

| Area | MVP (hackathon) | Stretch (admin portal) |
|------|-----------------|------------------------|
| Auth | Better Auth login + onboarding | Same — no new auth system |
| Product management | Create/edit/delete individual products | Full catalog UI with availability toggles, sort order, variants |
| Customer-facing | One landing page per product (`/p/:slug`) | Optional store catalog page (`/s/:storeSlug`) listing available products |
| Orders | Simple list on dashboard | Filterable orders table with status badges |
| Store settings | Business name only | Logo, description, store slug, open/closed toggle |
| UI | Tailwind-only forms | **shadcn/ui** shell: sidebar layout, data tables, dialogs |

The stretch goal reuses the same stack — no new services. It is mostly frontend polish plus a few schema fields and tRPC procedures.

### Admin portal routes

Nest merchant tools under `/admin` with a shared layout (sidebar + header):

| Route | Purpose |
|-------|---------|
| `/admin` | Redirect → `/admin/products` |
| `/admin/products` | Product catalog table — availability toggle, edit, QR download |
| `/admin/products/new` | Create product (image upload, variants) |
| `/admin/products/:id` | Edit product, preview landing page, regenerate QR |
| `/admin/orders` | Order history with status filters |
| `/admin/settings` | Store profile: name, slug, logo, description, open/closed |

Keep `/login` and `/onboarding` shared. After stretch, deprecate flat `/dashboard` and `/products/*` routes in favour of `/admin/*` (or redirect them).

### Admin UI stack

Add to `apps/web` for the stretch build:

```json
{
  "dependencies": {
    "@tanstack/react-table": "^8",
    "react-hook-form": "^7",
    "@hookform/resolvers": "^3",
    "lucide-react": "^0.400"
  }
}
```

- **shadcn/ui** — sidebar, `Table`, `Switch`, `Dialog`, `Badge`, form components.
- **TanStack Table** — sortable/filterable product and order grids.
- **React Hook Form + Zod** — product forms validated with the same Zod schemas as tRPC input.

Suggested layout:

```
┌─────────────────────────────────────────────────┐
│  Pinch Buy-a-bit        Jane's Café    [Logout] │
├──────────┬──────────────────────────────────────┤
│ Products │  Products                    [+ New]  │
│ Orders   │  ┌─────────────────────────────────┐ │
│ Settings │  │ Name      Price  Stock  Live  ⋮  │ │
│          │  │ Cookie    $5     12     ●    ⋮  │ │
│          │  │ Latte     $6     ∞      ○    ⋮  │ │
│          │  └─────────────────────────────────┘ │
└──────────┴──────────────────────────────────────┘
```

The **Live** toggle maps to `products.isAvailable` — the primary control for "what's in the store right now."

### Schema additions

Extend existing tables; no new auth tables required:

```typescript
// merchants — store-level settings
merchants
  storeSlug     text UNIQUE          // e.g. "janes-cafe" → /s/janes-cafe
  description   text
  logoUrl       text
  isStoreOpen   boolean DEFAULT true // master switch; closed store shows banner on catalog

// products — catalog visibility + ordering
products
  isAvailable   boolean DEFAULT true // merchant toggle; false = hidden from store + landing
  sortOrder     integer DEFAULT 0    // manual ordering in store catalog
  variants      jsonb                // [{ id, label, priceCents?, stockCount? }] — optional stretch

// product_variants (optional normalised alternative if variants get complex)
product_variants
  id            uuid PK
  productId     uuid FK → products.id
  label         text NOT NULL        // "Large", "Blue"
  priceCents    integer              // override; null = use product base price
  stockCount    integer
  isAvailable   boolean DEFAULT true
```

**Availability rules:**

- Customer `/p/:slug` returns 404 or "unavailable" if `!product.isAvailable` or `!merchant.isStoreOpen`.
- Store catalog `/s/:storeSlug` lists only products where `isAvailable = true` ordered by `sortOrder`.
- Checkout still validates availability server-side in `order.create` / `payment.charge` (don't trust the client).

### tRPC additions

| Router | New procedures | Notes |
|--------|----------------|-------|
| `merchant` | `updateStoreSettings`, `getStoreBySlug` | `getStoreBySlug` public for catalog page |
| `product` | `setAvailability`, `reorder`, `listForStore` | `listForStore` public; scoped to available products |
| `product` | `createVariant`, `updateVariant`, `deleteVariant` | Optional; skip if using JSONB `variants` column |
| `order` | `listForMerchant` *(enhance)* | Add filters: status, date range, productId |

Example availability toggle:

```typescript
// product.setAvailability — protected
setAvailability: protectedProcedure
  .input(z.object({ productId: z.string().uuid(), isAvailable: z.boolean() }))
  .mutation(async ({ ctx, input }) => {
    // verify product.merchantId === ctx.merchant.id
    await ctx.db.update(products)
      .set({ isAvailable: input.isAvailable })
      .where(and(eq(products.id, input.productId), eq(products.merchantId, ctx.merchant.id)));
  }),
```

### Customer-facing store catalog (optional stretch)

A **store page** complements per-product NFC/QR tags:

- URL: `/s/{storeSlug}` — lists all available products for that merchant.
- Useful for markets/events where one QR at the stall opens the full menu.
- Each product card links to `/p/{slug}` for checkout (keeps the existing payment flow).

NFC/QR generation options in admin:

- **Product QR** — existing `/p/:slug` (unchanged).
- **Store QR** — new `/s/:storeSlug` (stretch).

### Auth — no changes required

Better Auth already covers merchant login. The admin portal is the same `ProtectedRoute` + `protectedProcedure` boundary:

1. Merchant signs in via Better Auth (email/password).
2. Onboarding creates the `merchants` row.
3. All `/admin/*` routes require session + merchant.
4. Every product mutation checks `product.merchantId === ctx.merchant.id` — merchants only manage their own store.

Optional later: Better Auth **organization** plugin if multiple staff need access to one store. Out of scope for first stretch.

### Stretch build order

Assumes MVP demo loop is working.

1. Add schema fields (`isAvailable`, `storeSlug`, `sortOrder`) + migration.
2. Scaffold `/admin` layout with shadcn sidebar shell.
3. **Products table** — list, Live toggle wired to `product.setAvailability`.
4. **Product form** — React Hook Form with image URL/upload + optional variants.
5. **Orders table** — status badges, filter by paid/pending/failed.
6. **Store settings** — slug, logo, open/closed toggle.
7. *(Optional)* Store catalog page `/s/:storeSlug` + store QR generation.

Estimated effort: **4–8 hours** after MVP, depending on shadcn setup and variant complexity.

### Demo script addition

> "The café owner opens their admin portal, toggles the seasonal muffin on, and turns off the sold-out latte — customers scanning the stall QR only see what's available right now."

---

## Deployment sketch

| Service | Host | Notes |
|---------|------|-------|
| PostgreSQL | Railway Postgres plugin | Same project as API |
| API (Hono) | Railway / Fly.io | `PORT` env; run migrations on deploy |
| Web (Vite static) | Cloudflare Pages / Vercel | `VITE_API_URL` → production API |
| Webhooks | Public API URL | Register in Pinch dashboard |

**Deploy checklist:**

1. Run `db:migrate` against production DB.
2. Set all env vars.
3. Register webhook URL with Pinch.
4. Smoke test: create product → scan QR → pay → order appears in dashboard.

---

## Alternatives considered (and why not for this build)

| Option | Verdict |
|--------|---------|
| **Next.js** | Great for SEO; overkill when traffic comes from QR/NFC URLs |
| **Prisma** | Fine choice; Drizzle is lighter and fits tRPC typing patterns |
| **REST instead of tRPC** | More boilerplate; tRPC matches “TypeScript everywhere” |
| **Supabase** | Fast start but adds vendor coupling; plain Postgres + Drizzle is enough |
| **Express/Fastify** | Hono is smaller and has first-class tRPC adapter |
| **Lucia / hand-rolled sessions** | Better Auth ships email/password and Drizzle adapter with less custom code |

---

## Summary

**TypeScript end-to-end:** React + Tailwind on the client, Hono + tRPC on the server, Drizzle on Postgres, Better Auth for merchant sessions.

**Migrations:** Better Auth CLI for auth tables + Drizzle Kit for app tables (`generate` → `migrate` for production; `push` for local speed).

**Pinch stays behind a service layer** so tRPC routers stay thin and the demo script (tap → pay → dashboard update) is easy to trace.

**Stretch:** evolve `/dashboard` into `/admin/*` — a merchant portal for catalog availability, store settings, and order management on the same Better Auth + tRPC stack.

Next step: scaffold the monorepo, run `@better-auth/cli generate`, and commit the combined Drizzle schema before wiring Pinch payments.
