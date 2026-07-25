# AGENTS.md

Guidance for AI coding agents working in this repo. Humans: see [README.md](./README.md). Product/architecture detail: [docs/idea1-buy-a-bit.md](./docs/idea1-buy-a-bit.md) and [docs/idea1-buy-a-bit-tech-stack.md](./docs/idea1-buy-a-bit-tech-stack.md).

## What this is

**buy-a-bit** — Pinch Hackathon app: NFC/QR → product landing page → Pinch Payment Link → confirmation. Merchants manage products; customers stay anonymous.

pnpm monorepo, Node ≥ 20:

| Package | Path | Role |
|---------|------|------|
| `api` | `apps/api` | Hono + tRPC + Drizzle + Pinch webhooks (port **3001**) |
| `web` | `apps/web` | Vite + React 19 + Tailwind 4 + tRPC client (port **5173**) |
| `@buy-a-bit/shared` | `packages/shared` | Shared Zod schemas, procedure I/O, constants |

Scaffold is Phase 0: routers/pages exist; many procedures throw `Not implemented`. Prefer implementing stubs over inventing parallel APIs.

## Setup & commands

```bash
pnpm install
cp .env.example .env && cp .env.example apps/api/.env && cp .env.example apps/web/.env
docker compose up -d          # local Postgres
pnpm dev                      # API + web
pnpm typecheck                # all packages — run before finishing a task
pnpm db:push                  # Drizzle push (hackathon / local only)
pnpm db:generate && pnpm db:migrate   # real migrations before shared/deployed DB
```

- Filter: `pnpm --filter api <script>` / `pnpm --filter web <script>` / `pnpm --filter @buy-a-bit/shared <script>`
- Health: `http://localhost:3001/health`
- No test suite yet — use `pnpm typecheck` as the default verification gate. Add tests when introducing non-trivial logic.

## Boundaries

### Always

- Read `@buy-a-bit/shared` (`schemas.ts`, `procedures.ts`) before changing tRPC inputs/outputs; update shared Zod first, then API + web.
- Store money as **integer cents** (`priceCents`), never floats.
- Keep Pinch HTTP in `apps/api/src/services/`; routers orchestrate, services call Pinch.
- Resolve Pinch via `pinchClientForMerchant(merchant)`: **managed** = platform Application credentials + `Current-Merchant: mch_…`; **BYOK** = merchant’s encrypted Application ID/Secret (no impersonation header). See [Managed Merchants](https://docs.getpinch.com.au/docs/managed-merchants) and `docs/idea1-buy-a-bit.md`.
- Treat **webhooks as source of truth** for payment status; return-URL verify is UX fallback.
- Use `credentials: "include"` on the web tRPC client; CORS must allow `WEB_URL` with credentials.
- Prefer existing patterns: ESM `.js` import suffixes in API, `publicProcedure` / `protectedProcedure`, pages under `apps/web/src/pages/`.
- Run `pnpm typecheck` after substantive TS changes and fix errors you introduced.

### Ask first

- New top-level apps/packages, new payment providers, or schema redesigns that break existing contracts.
- Adding a UI component library (e.g. shadcn) or switching away from Vite SPA.
- Committing, pushing, or opening PRs — only when the user asks.
- Stretch features (`/admin/*`, `/s/:storeSlug`, variants) unless the task clearly targets them.

### Never

- Commit `.env`, secrets, or Pinch credentials. Use `.env.example` for new keys only.
- Call Pinch (or any secrets) from the browser.
- Trust client-supplied price/merchantId on checkout — load product server-side and authorize by `ctx.merchant`.
- Skip webhook signature verification when implementing `/webhooks/pinch`.
- Invent REST endpoints for app features — extend tRPC routers instead (auth + Pinch webhook are the intentional non-tRPC routes).
- Rewrite working scaffold for style-only reasons.

## Architecture map

```
apps/api/src/
  index.ts          Hono: CORS, /health, /trpc/*, /webhooks/pinch (+ /api/auth/* Day 1)
  auth.ts           Better Auth (Day 1)
  db/               Drizzle client + schema (auth tables + merchants/products/orders)
  trpc/             context, middleware, routers: merchant | product | order | payment
  services/         pinch.ts, qr.ts
  webhooks/pinch.ts raw body + signature verify

apps/web/src/
  pages/            routes wired in App.tsx
  components/       e.g. ProtectedRoute
  lib/trpc.ts       createTRPCReact<AppRouter> + credentials
  lib/auth-client.ts better-auth/react (Day 1)

packages/shared/    contract of record for procedure I/O
```

**Key flows**

1. Merchant: sign-in → onboarding (`merchant.create` with `managed` or `byok`) → product CRUD → QR/landing URL.
2. Customer: `/p/:slug` → `order.createCheckout` → Pinch redirect (merchant-scoped client) → `/payment/complete?session={orderId}` → `payment.verifyReturn`.
3. Async: Pinch webhook updates `orders.status` (`pending` | `paid` | `failed`); managed may also receive `compliance-updated`.

**Auth**

- Merchants only; Better Auth sessions + `merchants.userId`.
- `protectedProcedure` = session + linked merchant. Public: landing, checkout, payment verify.
- Import auth hooks from `better-auth/react`, not `better-auth/client`.

## Conventions

- **Contract-first:** change `@buy-a-bit/shared` when procedure shapes change; keep API `.input()` wired to those schemas.
- **Types:** export `AppRouter` from API; web imports `api/router` for client typing.
- **IDs:** UUIDs in shared schemas; product public URLs use **slug** (`/p/:slug`), not raw UUID.
- **Return URL:** `{WEB_URL}/payment/complete?session={orderId}`.
- **Pinch metadata** on payment links: `orderId`, `productId`, `merchantId`, `customerName`, `customerEmail`.
- **DB:** one Drizzle schema file for auth + app tables; generate Better Auth tables via `@better-auth/cli generate` then merge.
- **UI:** Tailwind utility styling; no required component library for MVP. Match existing page structure.
- **Scope:** implement MVP paths in the tech-stack doc before stretch admin/store catalog unless asked.

## Do / Don't

| Do | Don't |
|----|--------|
| Fill in existing router stubs and page shells | Create duplicate routers/pages beside them |
| Put shared Zod in `packages/shared` | Duplicate Zod objects in API and web |
| Authorize mutations with `product.merchantId === ctx.merchant.id` | Trust that the client owns the product id |
| Use `db:push` for solo local iteration | Use `push` against a shared/prod database |
| Point agents at `docs/` for deep design | Paste the whole tech-stack doc into chat/code |

## Security checklist (payments & auth)

- [ ] Webhook verifies signature (`PINCH_WEBHOOK_SECRET` and/or per-BYOK secret) before mutating orders
- [ ] Checkout loads product/price from DB; ignores client price; Pinch client resolved from product’s merchant
- [ ] Managed calls always send `Current-Merchant` when acting for a sub-merchant
- [ ] BYOK secrets encrypted at rest; never returned to the client or logged
- [ ] Protected mutations scoped to the session merchant
- [ ] Secrets only in server env; never `VITE_`-prefixed for API keys
- [ ] CORS origin is explicit (`WEB_URL`), credentials enabled deliberately

## When stuck

1. Check whether the procedure I/O already exists in `packages/shared/src/procedures.ts`.
2. Skim the relevant section of `docs/idea1-buy-a-bit-tech-stack.md` (routers, schema, Pinch, auth).
3. Mirror the nearest working stub (e.g. `productRouter`) rather than introducing a new pattern.

Update this file when agents repeatedly make the same mistake, or when setup/commands change.
