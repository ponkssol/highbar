# highbar ($BAR)

pump.fun-style Solana launchpad on Meteora Dynamic Bonding Curve (DBC), migrating to DAMM v2.
Concept and build plan: `BUILD_BRIEF.md`. Mainnet go-live: **`docs/MAINNET_CHECKLIST.md`**.

| Package | What |
|---|---|
| `apps/web` | Next.js 15 frontend (Reown AppKit wallets). Browser calls go through its same-origin `/hb-api/*` proxy to the API. |
| `apps/api` | Fastify API + indexer + Postgres store; payout jobs in `src/jobs` (fees, cashback, buyback, $BAR, referral, milestone). |
| `packages/onchain` | DBC configs, launch/trade builders, migration keeper. |
| `packages/shared` | Tiers, fee constants, shared math. |

## Setup (local, devnet)

    pnpm install
    cp .env.example .env                       # root (onchain scripts)
    cp apps/api/.env.example apps/api/.env     # API + jobs
    cp apps/web/.env.example apps/web/.env.local
    pnpm -r typecheck
    pnpm -r test

Node >= 22, pnpm 11 (`packageManager` in package.json). Keypairs live in `packages/onchain/keys/` (gitignored); never commit `.env*` or `*.keypair.json`.

## Environments

`NETWORK=devnet|mainnet` selects everything (RPC, config source, guards).

- **devnet**: configs come from `packages/onchain/configs.devnet.json`; RPC = `DEVNET_RPC` / `RPC_URL` / public devnet; the devnet keypair fallback works.
- **mainnet**: configs come only from `CONFIG_STANDARD_OFF … CONFIG_MAX_ON` env (or `configs.mainnet.json`), never the devnet file; RPC = `RPC_URL` only (public endpoint refused); the platform keypair must be given (`PLATFORM_KEYPAIR_JSON` or `PLATFORM_KEYPAIR_PATH`).
- On mainnet the API **refuses to start** when required env is missing or unsafe (`apps/api/src/security/prodCheck.ts`): treasury, referral wallet, `BAR_MINT`, the 6 configs, paid RPC, `DATABASE_URL`, `AUTH_SECRET`, https `SITE_URL`, `CORS_ORIGIN`, any `<FILL_ME>` left over. It also reads every config on-chain and warns when its fee claimer is not the platform key or treasury. `SKIP_CHAIN_CHECK=1` skips only the on-chain part.
- Mainnet env templates, one per Railway service: `deploy/mainnet/*.env.template` (Indonesian comments). Filled copies (`deploy/mainnet/*.env`) are gitignored.

## Database

Postgres (Railway). Migrations are SQL files in `apps/api/db/migrations`, applied by name + checksum:

    pnpm --filter @hb/api db:migrate

The API also runs pending migrations on start.

## Run locally

    pnpm --filter @hb/api dev                  # API on :4000 (indexer + scores inside)
    pnpm --filter @hb/web dev                  # web on :3000
    pnpm --filter @hb/onchain keeper --loop 30 # migrates finished curves to DAMM v2 (DRY_RUN=true only logs)

Jobs (dry-run unless `--live` or `DRY_RUN=false`; live mainnet also needs `ALLOW_MAINNET=true`):

    pnpm --filter @hb/api jobs:epoch           # claim fees -> cashback -> 40/50/10 split -> buyback & burn
    pnpm --filter @hb/api jobs:fees | jobs:cashback | jobs:buyback
    pnpm --filter @hb/api jobs:barsnap         # hourly $BAR holder snapshot
    pnpm --filter @hb/api jobs:feeshare        # $BAR holder fee share (payouts also need BAR_FEE_SHARE_LIVE=true)
    pnpm --filter @hb/api jobs:referral | jobs:milestone

DBC configs (`packages/onchain`):

    pnpm --filter @hb/onchain configs:dry              # offline build check
    pnpm --filter @hb/onchain configs:simulate         # devnet simulate
    pnpm --filter @hb/onchain configs:mainnet:print    # mainnet params, no RPC / keypair
    pnpm --filter @hb/onchain configs:mainnet:simulate # mainnet simulate, sends nothing

## Security

- Per-IP rate limits (in-memory, per instance; use Redis before scaling the API to >1 replica): global 300/min, tx builders 30/min, `/tx/launch` 6/min + 20/h, `/metadata` 6/min, `/referrals` 10/min, `/auth/*` 20/min, plus 5 launches per creator wallet per hour. Tune with `RATE_LIMIT_*` / `LAUNCHES_PER_*`.
- The web proxy forwards the user IP as `x-hb-client-ip` signed with `PROXY_SHARED_SECRET` (same value on web and API); without the secret the header is ignored.
- All public params validated (addresses, ints, text with control/bidi chars stripped, http(s) links, image magic bytes). Errors are JSON `{ error }`; 5xx are generic in production, no stack traces.
- `/reindex` needs `x-admin-token: $ADMIN_TOKEN` (disabled on mainnet without it).

## Deploy (Railway only)

One Railway project, one Postgres, services from this monorepo (root directory = repo root for all):

| Service | Config file (Settings > Config-as-code path) | Start | Env template |
|---|---|---|---|
| `api` | `deploy/railway/api.json` | `pnpm --filter @hb/api start` (pre-deploy: `db:migrate`, healthcheck `/health`) | `deploy/mainnet/api.env.template` |
| `web` | `deploy/railway/web.json` | `next start` on `$PORT` after `pnpm --filter @hb/web build` | `deploy/mainnet/web.env.template` |
| `keeper` | `deploy/railway/keeper.json` | `pnpm --filter @hb/onchain run keeper --loop 30` | `deploy/mainnet/keeper.env.template` |
| `jobs-epoch` | `deploy/railway/jobs-epoch.json` | cron `15 0 * * *` (00:15 UTC = 07:15 WIB) `jobs:epoch` | `deploy/mainnet/jobs.env.template` |
| `jobs-barsnap` | `deploy/railway/jobs-barsnap.json` | cron `5 * * * *` `jobs:barsnap` | `deploy/mainnet/jobs.env.template` |

Step-by-step (including pasting env via Variables > Raw Editor): `docs/MAINNET_CHECKLIST.md`.
Railway notes "config as code" (railway.json) is deprecated but keeps working until 2026-12-01; the same build/start commands can be typed into each service's Settings instead.
