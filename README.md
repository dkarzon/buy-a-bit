# buy-a-bit

Pinch Hackathon app — NFC-triggered instant checkout for physical products.

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
