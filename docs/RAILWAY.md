# Railway deploy settings (highbar)

Repo `ponkssol/highbar`, branch `main`. One Railway project, one Postgres (`Postgres`), five services.
All services: **Root Directory = repo root** (empty / `/`) so pnpm workspace deps (`@hb/shared`, `@hb/onchain`) resolve.
Builder: Railpack. Node from `engines.node` (`>=22`; set `RAILPACK_NODE_VERSION=22` to pin), pnpm from `packageManager` (`pnpm@11.9.0`).
`@hb/shared` and `@hb/onchain` ship TypeScript source (`main: src/index.ts`); there is no separate build step for them:
api / jobs / keeper run via `tsx`, web transpiles `@hb/shared` (`transpilePackages`).

> **Config as Code note.** `deploy/railway/<service>.json` holds the same settings as legacy Config-as-Code.
> Railway has deprecated Config as Code: **new services cannot opt into it** and files stop being read on 2026-12-01.
> For new services, type the settings below into each service's Settings (or port them to `.railway/railway.ts` IaC later).

| Service | Watch paths | Build command | Start / cron | Env template | Healthcheck |
|---|---|---|---|---|---|
| api | `apps/api/**`, `packages/**`, `pnpm-lock.yaml`, `package.json` | `pnpm install --frozen-lockfile` | `pnpm --filter @hb/api start` · Pre-deploy: `pnpm --filter @hb/api db:migrate` · restart ON_FAILURE | `deploy/mainnet/api.env.template` | `/health` (timeout 120 s) |
| web | `apps/web/**`, `packages/shared/**`, `pnpm-lock.yaml`, `package.json` | `pnpm install --frozen-lockfile && pnpm --filter @hb/web build` | `pnpm --filter @hb/web start` (`next start`: reads `$PORT`, binds 0.0.0.0) · restart ON_FAILURE | `deploy/mainnet/web.env.template` | `/` (timeout 120 s) |
| keeper | `packages/**`, `pnpm-lock.yaml`, `package.json` | `pnpm install --frozen-lockfile` | `pnpm --filter @hb/onchain run keeper --loop` · restart ALWAYS (interval: `--loop N` > `KEEPER_LOOP_SEC` > 900 s; 30 s fast lane near graduation) | `deploy/mainnet/keeper.env.template` | none (worker) |
| jobs-epoch | `apps/api/**`, `packages/**`, `pnpm-lock.yaml`, `package.json` | `pnpm install --frozen-lockfile` | `pnpm --filter @hb/api jobs:epoch` · cron `15 0 * * *` (00:15 UTC = 07:15 WIB daily) · restart NEVER | `deploy/mainnet/jobs.env.template` | none (cron) |
| jobs-barsnap | `apps/api/**`, `packages/**`, `pnpm-lock.yaml`, `package.json` | `pnpm install --frozen-lockfile` | `pnpm --filter @hb/api jobs:barsnap` · cron `5 * * * *` (minute 5 of every hour, UTC/WIB alike) · restart NEVER | `deploy/mainnet/jobs.env.template` | none (cron) |

Railway cron is UTC. `jobs:epoch` settles the previous **UTC** day (`apps/api/src/jobs/period.ts`), so 00:15 UTC runs just after the day closes.

## Ports and networking
- **api**: `app.listen({ port: Number(process.env.PORT ?? 4000), host: process.env.HOST || "0.0.0.0" })`. Template sets `PORT=4000`, `HOST=::` (IPv6 for Railway private networking). If a public domain is generated, target port 4000.
- **web**: `next start` honours `$PORT` (Railway injects it) and listens on all interfaces.
- **web -> api**: browser calls same-origin `/hb-api/*` (`apps/web/app/hb-api/[...path]/route.ts`), which proxies server-side to `API_URL`.
  SSR fetches also use `API_URL` (`apps/web/lib/api.ts`). No `NEXT_PUBLIC_*` vars; all web env is read at runtime.
  `API_URL=http://${{api.RAILWAY_PRIVATE_DOMAIN}}:${{api.PORT}}`; `PROXY_SHARED_SECRET` must match on api and web.

## Database / migrations
- `DATABASE_URL=${{Postgres.DATABASE_URL}}` on api, jobs-epoch, jobs-barsnap.
- SQL files `apps/api/db/migrations/*.sql`, applied by `apps/api/src/db/migrate.ts` (one transaction, `pg_advisory_xact_lock`, checksums in `schema_migrations`).
- api pre-deploy: `pnpm --filter @hb/api db:migrate`. The API also runs pending migrations on start; live jobs migrate too, dry-run jobs refuse to run if tables are missing.

## Keep off until the 6 mainnet DBC configs exist
`CONFIG_STANDARD_OFF/ON`, `CONFIG_HIGHER_OFF/ON`, `CONFIG_MAX_OFF/ON` are required on mainnet:
- **api** refuses to start (`apps/api/src/security/prodCheck.ts`) without them, or with any `<FILL_ME>` left. So api (and therefore web, which only proxies) cannot go healthy on mainnet until they exist.
- **keeper** exits on `<FILL_ME>` (crash loop with restart ALWAYS) and errors every tick without configs: keep it **paused**.
- **jobs-epoch / jobs-barsnap** abort on `<FILL_ME>` and need `PLATFORM_KEYPAIR_JSON`: leave the **cron schedule empty** until configs + keys are set. barsnap is a no-op until $HIGHER launches.
- Everything starts with `DRY_RUN=true`, `ALLOW_MAINNET=false`.