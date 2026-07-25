# buy-a-bit

Pinch Hackathon app — NFC/QR-triggered instant checkout for physical products.

> Scan it, Buy it, Take it

Merchants create a small product catalogue; each product gets a unique landing URL, QR code, and optional NFC tag. Customers tap or scan → enter contact details → pay on Buy-a-bit’s custom payment page (Pinch CaptureJS tokenisation + realtime charge) → confirmation. Aimed at cafés, markets, creators, events, and pop-ups.

Card data never hits Buy-a-bit servers. Merchants connect via **managed** Pinch sub-merchants or **BYOK** (bring your own Application credentials). Guest checkout is the default; customers can optionally create an account (same Better Auth login) to see order history and save one card per store (vaulted as a Pinch payment source — Buy-a-bit only keeps references).

Deeper product and architecture notes: [docs/idea1-buy-a-bit.md](./docs/idea1-buy-a-bit.md) and [docs/idea1-buy-a-bit-tech-stack.md](./docs/idea1-buy-a-bit-tech-stack.md).

Designs generated with help from [Stitch](https://stitch.withgoogle.com/projects/18321189259567826889)

## Phase 0 scaffold

| App / package | Path | Port |
|---------------|------|------|
| API (Hono + tRPC) | `apps/api` | **3001** |
| Web (Vite + React + Tailwind) | `apps/web` | **5173** |
| Shared Zod / contract | `packages/shared` | — |

## Quick start

```bash
# install
pnpm install

# copy env
cp .env.example .env
cp .env.example apps/api/.env
cp .env.example apps/web/.env

# local Postgres
docker compose up -d

# run API + web
pnpm dev
```

- API health: http://localhost:3001/health  
- Web: http://localhost:5173  

## Workspace scripts

| Script | What |
|--------|------|
| `pnpm dev` | API + web in parallel |
| `pnpm typecheck` | Typecheck all packages |
| `pnpm db:push` | Drizzle push (Day 1+) |

Shared API contract lives in `@buy-a-bit/shared` — agree on procedure inputs there before parallel Day 1 work.
