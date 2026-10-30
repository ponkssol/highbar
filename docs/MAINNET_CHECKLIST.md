# highbar mainnet checklist

Do the steps in order. Commands are PowerShell on your PC, run from the repo root `C:\Users\Ponks_sol\heiger-bar` unless the step says otherwise.
Everything is deployed on **Railway** (web, api, keeper, jobs). The treasury is **one normal wallet** for now.

Labels:
- **[BLOCKER]**: launch is unsafe or broken without it.
- **[NICE]**: can come after go-live.
- **[UNVERIFIED]**: built and tested on devnet or offline only, never run against mainnet.

Golden rules:
- Never commit `deploy/mainnet/*.env`, `.env*` or `*.keypair.json`.
- Keep mainnet keypairs **outside the repo**, e.g. `C:\Users\Ponks_sol\hb-mainnet-keys\`.
- Set `ALLOW_MAINNET=true` only in the shell for one command, or later in Railway for the keeper. Never put it in a file.
- Every payout job stays **dry-run** until the smoke test passes.

---

## 0. Pre-flight (5 min) [BLOCKER]

```powershell
git status                 # clean, on main
pnpm install
pnpm -r typecheck
pnpm -r test
```

## 1. Wallets [BLOCKER]

You need 3 separate wallets. Only #1 is a hot key on Railway.

| # | Role | How | Where it goes |
|---|---|---|---|
| 1 | **Platform key**: DBC config fee claimer, pays claims, cashback, creator LP rebates, buyback and keeper migrations | `solana-keygen new -o C:\Users\Ponks_sol\hb-mainnet-keys\platform.json` | `PLATFORM_KEYPAIR_JSON` (sealed) on keeper + jobs; pubkey as `PLATFORM_PUBKEY` / `FEE_CLAIMER_PUBKEY` |
| 2 | **Treasury**: receives claimed fees and is the config leftover receiver | Phantom/Solflare/Ledger wallet you control. A single wallet is OK; a multisig is a later [NICE] | `TREASURY_PUBKEY` (public key only) |
| 3 | **Referral wallet**: its WSOL ATA receives the referral fee on every swap; it is the only source of user referral payouts and signs them | a fresh wallet; **never trade or swap from it** (the SDK/Jupiter would close its WSOL ATA) | `REFERRAL_WALLET` + `PLATFORM_REFERRAL_TOKEN_ACCOUNT`; jobs only: `REFERRAL_KEYPAIR_PATH` (secret, never committed) |

Rules the code enforces:
- The platform key must not be the referral wallet. Buyback refuses this, and the API warns.
- The fee claimer must not be the devnet key (`9TAV…` / `keys/devnet.keypair.json`) or the referral wallet; `createConfigs` blocks both.
- The treasury may equal the platform key, but then all fees sit on the hot key (the API warns). Prefer a separate treasury.
- `LOCK_TIP_WALLET` (lock-tx protocol tip, with `LOCK_TIP_SOL`) must be a **dedicated** wallet. On mainnet both are required (no fallback), and the API refuses to start if the tip wallet equals the platform key, the treasury, the referral wallet, `OFFICIAL_TOKEN_CREATOR` or `9TAV…`.

```powershell
solana-keygen pubkey C:\Users\Ponks_sol\hb-mainnet-keys\platform.json   # -> PLATFORM_PUBKEY
```

Fund the platform key with about **0.7 SOL** for setup + 20 migrations (about 1.75 SOL for 50): config rent (about 6 × 0.01 SOL), the referral ATA, claims, and the keeper's migrations. A 2-position DBC to DAMM v2 migration measured **0.0237 SOL** on mainnet (pool 0.0063 + 2 positions + 2 Token-2022 NFT mints + 4 token accounts + fee), paid by the keeper payer (this key), not the curve. On top of that, hold one epoch's payouts (cashback + creator LP rebates) plus the buyback budget.
- The DBC migration fee and the surplus withdraw land on the **platform key**, not the treasury: the SDK calls take no receiver. There is no sweep job for now; top-ups and sweeps (platform key to treasury) are manual.

### 1b. Referral WSOL ATA [BLOCKER]

Swaps pass the referral token account, so it must exist before the first trade.

```powershell
spl-token create-account So11111111111111111111111111111111111111112 --owner <REFERRAL_WALLET> --fee-payer C:\Users\Ponks_sol\hb-mainnet-keys\platform.json --url <QUICKNODE_RPC_URL>
spl-token address --token So11111111111111111111111111111111111111112 --owner <REFERRAL_WALLET> --verbose --url <QUICKNODE_RPC_URL>   # -> PLATFORM_REFERRAL_TOKEN_ACCOUNT
```

## 2. Paid RPC (QuickNode) [BLOCKER]

- In the QuickNode dashboard, go to **Endpoints → Create endpoint → Solana Mainnet**, and create **two** endpoints:
  - a **server** endpoint for api, keeper and jobs (`RPC_URL=https://<name>.solana-mainnet.quiknode.pro/<token>/`). Use it as `<QUICKNODE_SERVER_RPC_URL>` / `<QUICKNODE_RPC_URL>` in the commands here;
  - a **browser** endpoint for the web service's `RPC_URL`, locked to your web domain via the endpoint's **Security** settings (referrer/domain whitelist). The web RPC URL is visible to every visitor.
- Check the plan:
  - `getProgramAccounts` must be allowed. The indexer and the `$HIGHER` barsnap/feeshare jobs use it.
  - The plan's requests-per-second limit must cover indexer polling (30 s), keeper (30 s), jobs and browser traffic.
- WebSocket (`wss://…`) is not used by the code today, so `RPC_WS_URL` is optional.
- The public `api.mainnet-beta.solana.com` is refused by the API startup check and by `createConfigs --send`. It also returns 429 on `getProgramAccounts`, which the indexer and the $HIGHER jobs need.

## 3. Official $HIGHER token (not a blocker for go-live)

The official ecosystem token is **$HIGHER**, launched on highbar itself by ONE dedicated dev wallet.
- `OFFICIAL_TOKEN_CREATOR=<dev wallet pubkey>` on api and jobs (and keeper/web for consistency). Leave it **empty** until that wallet is final (not `<FILL_ME>`). While empty the startup check only warns, nothing is auto-detected, and every launch with symbol `HIGHER` is refused with 403.
- `OFFICIAL_TOKEN_SYMBOL=HIGHER` (default; compared case-insensitively).
- Set `OFFICIAL_TOKEN_CREATOR` and restart api + jobs **before** the dev wallet launches $HIGHER. The indexer then records the FIRST launch by that wallet with that symbol (migration 0006, `official_token`), once. Later launches never replace it.
- Launches with symbol `HIGHER` from any other wallet get **403** ("reserved for the official highbar ecosystem token").
- Only the admin endpoints change a recorded token: `POST /admin/official-token {"mint": "..."}` (override) and `DELETE /admin/official-token` (clear, back to auto-detection), both with header `x-admin-token: $ADMIN_TOKEN`. `GET /official-token` shows the current state.
- `BAR_MINT` is now an optional manual override: if set it wins, otherwise the detected mint is used. Buyback, holder tiers/perks, fee share, the Max tier gate, `/stats` and `/burn` all use the same resolver.
- Before $HIGHER exists every perk is off, the perks pages show "not launched yet", and the buyback budget only accrues.
- Do **not** run `bar:mock-mint` on mainnet. It is devnet only.

## 4. Create the 6 mainnet DBC configs [BLOCKER]

The script is the devnet one with a `--network mainnet` mode. By default it prints or simulates and sends nothing. Settings:
- Fee claimer = the **platform key** (#1), because `jobs:fees` signs claims with that key. `FEE_CLAIMER_PUBKEY` must equal the platform key when you create the configs (the fee claimer can't be changed later).
- Leftover receiver = the **treasury** (#2).
- Run it from `packages\onchain`.

```powershell
cd packages\onchain
$env:NETWORK="mainnet"
$env:RPC_URL="<QUICKNODE_SERVER_RPC_URL>"
$env:PLATFORM_KEYPAIR_PATH="C:\Users\Ponks_sol\hb-mainnet-keys\platform.json"
$env:FEE_CLAIMER_PUBKEY="<PLATFORM_PUBKEY>"      # NOT 9TAV..., NOT the referral wallet
$env:TREASURY_PUBKEY="<TREASURY_PUBKEY>"
$env:LEFTOVER_RECEIVER="<TREASURY_PUBKEY>"
$env:REFERRAL_WALLET="<REFERRAL_WALLET>"

pnpm configs:mainnet:print       # 1) check fee claimer / leftover / tier params (no RPC)
pnpm configs:mainnet:simulate    # 2) builds + simulates all 6 createConfig txs on mainnet; sends nothing
```

For step 2, all 6 configs must print `simulate ok`, and there must be no `BLOCKED` lines. Read every `WARN`.

```powershell
# 3) the only real send. ALLOW_MAINNET lives in this shell for this one command:
$env:ALLOW_MAINNET="true"; npx tsx src/createConfigs.ts --network mainnet --send --confirm-mainnet; Remove-Item Env:ALLOW_MAINNET
cd ..\..
```

- The send writes `packages/onchain/configs.mainnet.json`, which holds public keys only. Copy the 6 addresses into `CONFIG_STANDARD_OFF … CONFIG_MAX_ON` for api, keeper and jobs.
- Re-running is blocked while that file has configs (`--force` overrides). That stops duplicate configs.
- Check one config on Solscan: the fee claimer is the platform key, and the quote mint is WSOL.
- [UNVERIFIED] Mainnet `createConfig` was only simulated by you in step 2. The tier values match the devnet configs (offline tests in `packages/onchain/src/configs.test.ts`).
- Note: the Higher tier's creator fee is stored as **62%**, not 62.5%. The SDK takes integer percentages.

## 5. Railway project + mainnet Postgres [BLOCKER]

1. Create a **new** Railway project (e.g. `highbar-mainnet`). Do not reuse the devnet DB.
2. **+ New → Database → PostgreSQL.** Services reference it as `${{Postgres.DATABASE_URL}}` (already in the templates).
3. **+ New → GitHub Repo → this repo**, 6 times. Then rename the services `api`, `web`, `keeper`, `jobs-epoch`, `jobs-barsnap`, `mint-pool`. The web template's `API_URL` uses the name `api`.
4. For each service, go to **Settings**:
   - Root Directory: `/` (the monorepo root).
   - **Config-as-code file path**: `deploy/railway/<service>.json`.
   - If Railway does not offer or pick up the config file (it says config-as-code is deprecated, working until 2026-12-01), type the same commands into Settings by hand:

| Service | Build command | Start command | Extra |
|---|---|---|---|
| api | `pnpm install --frozen-lockfile` | `pnpm --filter @hb/api start` | Pre-deploy `pnpm --filter @hb/api db:migrate`; healthcheck `/health`; **Networking → Generate Domain** (optional; the web reaches it privately) |
| web | `pnpm install --frozen-lockfile && pnpm --filter @hb/web build` | `pnpm --filter @hb/web exec next start -H 0.0.0.0 -p ${PORT:-3000}` | **Generate Domain** or add a custom domain |
| keeper | `pnpm install --frozen-lockfile` | `pnpm --filter @hb/onchain run keeper --loop 30` | restart ALWAYS |
| jobs-epoch | `pnpm install --frozen-lockfile` | `pnpm --filter @hb/api jobs:epoch` | Cron `15 0 * * *` (UTC = 07:15 WIB), restart NEVER |
| jobs-barsnap | `pnpm install --frozen-lockfile` | `pnpm --filter @hb/api jobs:barsnap` | Cron `5 * * * *`, restart NEVER |
| mint-pool | `pnpm install --frozen-lockfile` | `pnpm --filter @hb/api mint-pool:refill --loop 30` | restart ALWAYS; no domain, no pre-deploy (the api migrates). CPU-bound: see step 6a |

5. Migrations: the api pre-deploy runs `db:migrate`, and the API runs pending migrations on start too. To run them by hand from the PC against the mainnet DB, use Postgres → Connect → *public* URL:
   ```powershell
   $env:DATABASE_URL="<railway public postgres url>"; pnpm --filter @hb/api db:migrate; Remove-Item Env:DATABASE_URL
   ```

## 6. Env per service (Raw Editor) [BLOCKER]

For each service:
1. Copy its template to a gitignored file and fill it in on your PC:
   ```powershell
   Copy-Item deploy\mainnet\api.env.template deploy\mainnet\api.env      # gitignored
   notepad deploy\mainnet\api.env
   ```
   Replace every `<FILL_ME>`. **Delete** optional lines you don't use (e.g. `JUPITER_API_KEY`, `ADMIN_TOKEN`) rather than leaving `<FILL_ME>`. The API, keeper and jobs refuse to start while any value still contains `<FILL_ME>`.
2. In Railway, open the service → **Variables** → **Raw Editor**. Paste the whole file → **Update Variables**.
3. For secrets (`PLATFORM_KEYPAIR_JSON`, `AUTH_SECRET`, `PROXY_SHARED_SECRET`, `ADMIN_TOKEN`, `MINT_POOL_ENC_KEY`), open the variable's ⋮ menu → **Seal**.
   - `PLATFORM_KEYPAIR_JSON` is the whole content of `platform.json` (the `[12,34,…]` array). Paste it yourself; it never goes in git.

| Template | Service(s) | Must match across services |
|---|---|---|
| `deploy/mainnet/api.env.template` | api | `MINT_POOL_ENC_KEY` (= mint-pool) |
| `deploy/mainnet/web.env.template` | web | `PROXY_SHARED_SECRET` (= api), `SITE_URL` (= api) |
| `deploy/mainnet/keeper.env.template` | keeper | the 6 `CONFIG_*` (= api) |
| `deploy/mainnet/jobs.env.template` | jobs-epoch **and** jobs-barsnap | `TREASURY_PUBKEY`, `REFERRAL_WALLET`, `OFFICIAL_TOKEN_CREATOR` (later), optional `BAR_MINT`, `CONFIG_*` (= api) |
| `deploy/mainnet/mint-pool.env.template` | mint-pool | `MINT_POOL_ENC_KEY`, `MINT_POOL_MIN_AVAILABLE`, `MINT_POOL_RESERVATION_MIN` (= api), same Postgres |

Also:
- `SITE_URL` and `CORS_ORIGIN` are the final https web domain. Token metadata URIs are built from `SITE_URL`, so set the custom domain **before** the first launch.
- Web `NETWORK=mainnet` is read by the web server at runtime (no build-time env vars); a restart applies a change.
- `REOWN_PROJECT_ID`: add the web domain to the Reown project's allowlist.

### 6a. Vanity mint pool (every launch's mint ends in `high`) [BLOCKER]

| Variable | Services | Value |
|---|---|---|
| `VANITY_MINTS` | api | `fallback` (default). `on` = vanity only, empty pool = 503; `fallback` = vanity when available, else a random mint (flagged); `off` = always random, pool unused. Any other value: the API refuses to start. |
| `MINT_POOL_ENC_KEY` | api **and** mint-pool (identical), sealed | 32 random bytes, hex or base64: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`. Never on web, never `NEXT_PUBLIC_*`. `VANITY_MINTS=on`: the API refuses to start on mainnet without a valid key. `fallback`: missing = warning (random mints), malformed = refuses to start. `off`: not needed. Losing or changing it makes every stored mint unusable (refill again). |
| `MINT_POOL_MIN_AVAILABLE` | api + mint-pool | `50` (pool target) |
| `MINT_POOL_RESERVATION_MIN` | api + mint-pool | `10` (minutes a launch holds its mint) |
| `MINT_POOL_THREADS` | mint-pool | = the service's vCPU count (set it explicitly; the container may report the host's CPUs) |

- Cost: an address needs ~11.3 M ed25519 keys on average. One core does ~20–25 k keys/s (measured on a Ryzen 5 5600: 25.6 k), so **~7.5–9 CPU-minutes per address** and **~6–7.5 CPU-hours to fill 50**. On 2 vCPU that is ~3.5 h for the first 50; afterwards it only grinds what launches consume (~4 min per launch on 2 vCPU).
- Fill the pool **before** go-live: deploy mint-pool early (it waits for the `mint_pool` table, created by the api's migration 0010) and check `pnpm --filter @hb/api mint-pool:status` or its log line `available N / min 50`.
- Empty pool: with `VANITY_MINTS=fallback` (default) the launch uses a normal random mint (the pre-vanity path: the API pre-signs with a throwaway key, the wallet signs and sends). It is flagged, never silent: API log `[mint-pool] pool empty -> fallback random mint for creator <wallet> (<reason>)` and response `vanity:false, mintSource:"random-fallback"` (`"pool"` / `vanity:true` otherwise); the launch page says it used a standard address. With `VANITY_MINTS=on` launches answer `503 MINT_POOL_EMPTY` instead. Watch for that log line after go-live: it means the pool needs more CPU.
- Wallet guards: the wallet signs first, so Phantom may add Lighthouse assertions (`L2TExMFKdjpN9kozasaurPirfHy9P8sbXoAN1qA3S95`) and ComputeBudget instructions. The co-sign validator allows those anywhere as long as they never reference the mint (in a legacy tx signer/writable flags are per account, so even a "read-only" mention would carry the mint's signer + writable privileges) and add no signer besides the creator; everything else extra (transfers, memos, SetAuthority, unknown programs, extra signers) is still refused.
- Expired reservations go back to the pool only if the mint account does not exist on-chain (checked over RPC); otherwise the mint is marked used. A mint is never handed out twice.

## 7. Deploy and go-live order [BLOCKER]

1. **api** goes first.
   - The logs must show the startup check passing and the config fee claimers matching. `refusing to start on mainnet: …` lists exactly what is missing.
   - `https://<api-domain>/health` returns `{"ok":true,…,"dryRun":true}`.
2. **web**: open the site. The sidebar shows `· mainnet`, and the wallet modal offers Solana mainnet only.
3. **keeper**: keep `DRY_RUN=true` at first. Logs show `[DRY_RUN]` ticks listing the 6 configs.
4. **mint-pool**: right after the api (migration 0010). Logs show `grinding N "...high" mint(s)` and then `available 50 / min 50`. Do not open launches before the pool has a healthy buffer.
5. **jobs-epoch / jobs-barsnap**: dry-run. Trigger once with **Deploy → Run now**. Logs show `[DRY_RUN]` and would-claim / would-pay lines, with no signatures.

## 8. Smoke test (you, real SOL, small amounts) [BLOCKER]

1. Connect a personal wallet (not the platform, treasury or referral wallet). Sign in. The SIWS message says `Network: mainnet`.
2. Launch a test token on **Standard, anti-sniper off** with a tiny or zero dev buy. Check:
   - the token page loads and the mint address ends in `high`;
   - Solscan shows the pool under `CONFIG_STANDARD_OFF`;
   - the metadata URI is `https://<SITE_URL>/hb-api/meta/…json`.
3. Buy 0.01 SOL, then sell part of it. Check:
   - both trades appear on the token page within about 30 s (indexer);
   - the referral WSOL ATA balance went up.
4. Run `jobs-epoch` with Run now (dry-run). The log shows a `would-claim` line for the test pool.
5. Check the rate limit: repeating "create token" quickly from one IP gets a 429 after 6 per minute.
6. Rollback drill: set `LAUNCHES_PAUSED=true` on api. Creating a token fails with "launches are paused". Set it back to `false`.

## 9. Turn on live operations (after the smoke test)

- **Keeper live** [BLOCKER before any curve fills]:
  - Trading on a curve stops at the threshold (85, 150 or 250 SOL on mainnet; devnet configs keep 40, 80 or 100 SOL) until it is migrated to DAMM v2.
  - After migration the DAMM v2 pool fee is 1%; DAMM v2 takes a 20% protocol cut, so the locked LP earns 0.8% of volume (LP split 20/80, 40/60, 50/50). With the creator LP rebate (`LP_REBATE_BPS` 6875 / 6875 / 7500 of the platform's claimed LP fees) the net is creator 0.60% / 0.65% / 0.70%, platform 0.20% / 0.15% / 0.10%, Meteora 0.20% (Standard / Higher / Max). Full model: BUILD_BRIEF section 5.
  - In Railway → keeper → Variables, set `DRY_RUN=false` and `ALLOW_MAINNET=true`.
  - [UNVERIFIED] DAMM v2 migration was only tested on devnet (`docs/devnet-migration-test.md`). Watch the first real migration live.
- **Fee claims** [NICE for day 1]: on jobs-epoch, set `DRY_RUN=false` and `ALLOW_MAINNET=true` only after a dry-run epoch looks right. Cashback, the creator LP rebate (`jobs:lprebate` runs inside epoch) and the 40/50/10 split also go live with this. The platform key pays rebates and cashback, so keep it funded from the treasury.
- **Buyback** [UNVERIFIED]:
  - The Jupiter path never ran on mainnet. The first live buyback should be a manual, tiny one from the PC:
    `pnpm --filter @hb/api jobs:buyback -- --live --budget-sol 0.01`
    Run it with mainnet env in the shell, `ALLOW_MAINNET=true` for that one command only.
  - Keep `BUYBACK_MAX_ORDER_SOL` small.
- **$HIGHER fee share payouts** [NICE]: keep `BAR_FEE_SHARE_LIVE=false` until the legal review.
- **Referral and milestone payouts** [NICE]: run them dry-run by hand first (`jobs:referral`, `jobs:milestone`). Add cron services later.
- **User referral funds flow** [NICE]: referrers are paid only from the referral wallet's swap-referral income (20% of Meteora's protocol fee, ~0.04% of curve volume), never from the platform share.
  - Swap -> referral fee lands as WSOL in `PLATFORM_REFERRAL_TOKEN_ACCOUNT` -> `jobs:referral --live` (signed by the referral wallet) closes and re-creates that WSOL ATA in one tx (unwrap, rent returned) -> sends SOL to referrers. The referral wallet pays its own tx fees (~5000 lamports per batch).
  - Set `REFERRAL_KEYPAIR_PATH` only on the jobs service, pointing at the referral wallet's key file (must match `REFERRAL_WALLET`; must not be the platform key; the job refuses otherwise). Without it the job is dry-run only. The platform key never pays referrers.
  - Seed the referral wallet once with ~0.02 SOL: the payout pre-check wants the payout + 0.01 SOL buffer, and it pays tx fees. Afterwards it is self-funding.
  - Unallocated income (non-referred trades) accumulates in the referral wallet. Moving it anywhere (e.g. to the treasury) is a manual transfer by the key holder; nothing sweeps it automatically.
  - First live run: dry-run, check `income` vs the WSOL ATA balance change for that day, then `ALLOW_MAINNET=true ... jobs:referral -- --live --period <day>` once.

## 10. Rollback

| Problem | Action |
|---|---|
| Bad web or api deploy | Railway → service → Deployments → previous deployment → **Redeploy**. |
| Stop new launches | api variable `LAUNCHES_PAUSED=true` (existing tokens keep trading on-chain). |
| A job misbehaves | Set `DRY_RUN=true` / remove `ALLOW_MAINNET` on that service, or remove its cron schedule. |
| Wrong config values | On-chain configs can't be edited or deleted. Create new ones (step 4 with `--force`), point the `CONFIG_*` vars at them, and move the old addresses into the `legacy` list of `packages/onchain/configs.mainnet.json` so old pools are still indexed and migrated. |
| Platform key leaked | Move its SOL out, generate a new key, update `PLATFORM_KEYPAIR_JSON` / `PLATFORM_PUBKEY`. The configs' fee claimer is fixed, so new configs are needed to claim with the new key. |

Pools, curves and LP locks live on-chain. Rolling back the app never touches users' funds.

## Later [NICE]

- Treasury multisig (e.g. Squads). If it becomes the fee claimer, claims need multisig proposals, so keep the platform key as claimer and use the multisig as receiver. Rebate / cashback / milestone payouts are sent from the platform key, so it then needs top-ups from the vault (multisig proposals; not automated). User referral payouts come from the referral wallet and are unaffected.
- Redis-backed rate limits before running more than 1 api replica (limits are in-memory per instance).
- Migrate Railway config-as-code files to Railway's newer Infrastructure-as-Code before 2026-12-01.
- Error tracking (Sentry) and uptime checks on `/health`.
