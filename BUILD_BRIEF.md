# Higher Bar ($BAR) - Full Concept & Build Brief

> **Untuk Aes:** File ini isinya konsep lengkap plus panduan build. Buka chat Agent di Cursor (Ctrl+L, mode Agent), lalu tempel prompt di bagian 12 satu per satu, step demi step. Angka yang ditandai (example) masih contoh atau belum terverifikasi.

---

## 1. Concept
**Higher Bar** is a pump.fun-style Solana memecoin launchpad where **creators choose their own bonding/migration target** at launch, instead of a fixed ~85 SOL. Higher targets mean deeper liquidity at migration and a "raise the bar" culture.
- Ticker: **$BAR**. Narrative: "Raise the bar. Set a better standard."
- Original idea credit: **ContextChain** (keep a credits section on the site).
- Built on **Meteora Dynamic Bonding Curve (DBC)**: no custom smart contract.

## 2. Problem and solution
- **Problem:** tokens bond at a low target, liquidity is thin, then they dump right after migration. Everyone only chases bonding.
- **Solution:** tiered migration targets chosen by the creator, better creator fees for higher tiers, optional anti-sniper, transparent badges/scores, and a $BAR buyback & burn funded by platform activity.

## 3. Competitors
| | pump.fun (official, fee page updated 17 Oct 2026) | StonkFun (unverified, third-party sources) | Higher Bar |
|---|---|---|---|
| Curve trading fee | 1.25% (creator 0.30%, protocol 0.95%) | 1% (creator 0% or ~0.5%, sources conflict) | 1% |
| Extra app fee | 0.45% on web/mobile (0.40% with referral) | none known | none |
| Graduation | curve graduates at ~85 SOL (0.015 SOL flat graduation fee) | ~85 SOL to Raydium CPMM | creator picks 85/150/250 SOL |
| Creator LP share | no | no (LP locked to platform) | yes, locked |
| Trader cashback | no | no | 0.05% |
| Token buyback | not on fee page | ~60% of platform revenue to $STONK (unverified) | 40% of platform net to $BAR |

## 4. Tiers and Meteora DBC configs
Migration target is set **per DBC config**, not per token, and cannot change after launch. Anti-sniper fee schedule is also per config. So: **3 tiers x anti-sniper ON/OFF = 6 configs**, created once and reused.

| Config | Tier | migrationQuoteThreshold | Anti-sniper |
|---|---|---|---|
| 1 | Standard | 85 SOL | OFF |
| 2 | Standard | 85 SOL | ON |
| 3 | Higher | 150 SOL | OFF |
| 4 | Higher | 150 SOL | ON |
| 5 | Max | 250 SOL | OFF |
| 6 | Max | 250 SOL | ON |

- **Mainnet targets: 85 / 150 / 250 SOL.** pump.fun graduates at ~85 SOL, so Standard matches it and Higher / Max raise the bar. Source of truth: `MAINNET_THRESHOLD_SOL` / `thresholdSolFor(tier, network)` in `packages/shared`.
- **Devnet** keeps the existing 6 configs at 40 / 80 / 100 SOL (`DEVNET_THRESHOLD_SOL`), so nothing on devnet has to be recreated.

- **Anti-sniper OFF:** flat 1% base fee from the first trade.
- **Anti-sniper ON:** fee scheduler (linear or exponential) starting high and decaying to 1%, e.g. 25% to 1% over the first few minutes (example, not final). DBC: base fee min 0.25%, total fee max 99%.
- Migration target: **DAMM v2 only** (DAMM v1 is deprecated for new configs).
- Token decimals: 6-9.

## 5. Fee model (final)
All shares are % of trade volume unless stated. Source of truth in `packages/shared`: `TIERS`, `curveFeeSplit`, `lpFeeSplit`, `LP_REBATE_BPS`, `postMigrationSplit`, `feeModel`. All numbers use the on-chain fee values (see `ONCHAIN_PERCENT_NOTE`). Pitch line: **higher creator earnings through graduation**.

**Before migration (bonding curve, 1% per trade).** Meteora's DBC protocol fee is 20% of the fee (0.20%). The remaining 0.80% is split by the config's `creatorTradingFeePercentage`:

| Tier | creatorTradingFeePercentage | Creator | Platform | Meteora |
|---|---|---|---|---|
| Standard | 50% | 0.40% | 0.40% | 0.20% |
| Higher | 62% | 0.50% (on-chain 0.496%) | 0.30% (on-chain 0.304%) | 0.20% |
| Max | 75% | 0.60% | 0.20% | 0.20% |

Higher targets 0.50 / 0.30, but DBC fee percentages are whole-number u8s, so the config stores 62% (62.5% can't be set): ~0.496 / 0.304.

**After migration (DAMM v2, 1% pool fee).** DAMM v2 keeps 20% as its protocol fee (0.20%). The permanently locked LP earns 0.80%, split on-chain by the LP split (creator/platform 20/80, 40/60, 50/50; unchanged). On top of its LP share, the creator receives a **creator LP rebate**: the platform forwards `LP_REBATE_BPS` (fixed per tier in code, not configurable) of the LP fees it actually claims on its own position.

| Tier | Creator LP | Platform LP | LP_REBATE_BPS (of platform LP) | Creator net | Platform net | Meteora |
|---|---|---|---|---|---|---|
| Standard | 0.16% | 0.64% | 6875 (0.44%) | **0.60%** | **0.20%** | 0.20% |
| Higher | 0.32% | 0.48% | 6875 (0.33%) | **0.65%** | **0.15%** | 0.20% |
| Max | 0.40% | 0.40% | 7500 (0.30%) | **0.70%** | **0.10%** | 0.20% |

- The rebate goes to the token's DBC pool creator as read on-chain when the claim is accrued (follows `transferPoolCreator`), even if the creator LP NFT was sold. Platform, treasury and referral wallets as creator get nothing (recorded with a skip reason).
- Fee collect mode is OnlyB, so LP fees are SOL. A base-token LP fee should never happen; the jobs alert and do not rebate it.
- Paid by `jobs:lprebate` (also inside `jobs:epoch`), per wallet once it reaches `LP_REBATE_MIN_PAYOUT_SOL` (default 0.01 SOL); smaller balances carry over. Floor rounding; dust stays with the platform.
- DBC rule: at least 10% of the LP must stay locked after 1 day.

**Migration fee (% of the migrated quote):** Standard 1%, Higher 1%, Max 0%. The creator gets 0% / 50% / 0% of it, the platform the rest. Meteora also takes a fixed 0.2% of liquidity at migration. (Earlier targets such as Standard 1.5% or Max 0.5% at 50% creator cannot be set as whole-number percentages.)

**Pool creation fee:** 0 (free launch).

**Platform share (waterfall, `jobs:epoch`):**
1. Creator LP rebate (post-migration LP fees only, above).
2. Trader cashback: 0.05% of the volume traded through the Higher Bar UI. Paid in SOL today; a later change will pay it in $HIGHER.
3. The remaining net splits **40% buyback & burn $HIGHER, 50% operations, 10% treasury**.

**Referral (as implemented; verified in code):**
- *DBC curve swaps:* every swap built by Higher Bar (`/tx/swap`, the launch dev-buy, `packages/onchain` trade/launch) passes the platform's `REFERRAL_WALLET` WSOL account as the referral account (none when the swap is min-fee eligible). The DBC program pays it 20% of Meteora's protocol fee (= 4% of the fee, 0.04% of volume), out of Meteora's share, not the creator's or the platform's. It lands directly in the platform's referral wallet (not claimed by the fee job, not part of the `fee_claims` gross or the 40/50/10 split). It is the **only** funding of the user referral program below; whatever is not passed on stays in the referral wallet (`feeModel` counts it on the platform side as "referral cut").
- *DAMM v2:* the pool program can give a referral account a share of its protocol fee, but Higher Bar builds no DAMM v2 swaps (post-migration trading happens on Jupiter / Meteora), so no referral is earned after migration.
- *User referral program (section 7):* funded **only** from that referral-wallet income, never from the platform share (40/50/10 untouched). Per closed UTC day (`jobs:referral`, `services/referral.ts`, ledger `referral_income` + `referral_rewards`, migration 0009):
  - **Income** = the referral fee of every Higher Bar (via_ui) swap that day, from the indexed swap event (`trades.referral_fee_lamports`, the exact amount the program moved into the referral account; older rows fall back to 400 bps of the trade fee). Event-based because it is per swap, per day and replayable; the WSOL balance is not used as the figure (unwraps move it) but caps what can be sent.
  - **Distribution**: budget = min(income + carry-in, `REFERRAL_REWARD_BPS` (default 10000 = all) of the referral fee generated by referred wallets' trades + carry-in). Each referrer gets floor(budget x their referees' curve volume / all referred volume) (only trades after the referral was made; platform / treasury / referral wallets never earn). Rounding dust carries to the next day; income from non-referred trades stays in the referral wallet. Balances are paid once they reach `REFERRAL_MIN_PAYOUT_SOL` (0.001), smaller ones roll over.
  - **Caps**: a day never allocates more than it received, total payouts never exceed total recorded allocations (<= income), and the referral wallet's own SOL balance is checked before each batch.
  - **Idempotent**: a day is rewritten only while none of its rewards is pending / paid and no later day exists; payouts persist the signature before sending and are reconciled (same as cashback). Dry-run by default; every tx is simulated.
  - **Signer / funds flow**: payouts are signed by the **referral wallet** (`REFERRAL_KEYPAIR_PATH` / `REFERRAL_KEYPAIR_JSON`, must match `REFERRAL_WALLET`; without it the job only dry-runs). It first unwraps its WSOL income (close + re-create the WSOL ATA in one tx, so swaps never see it missing), then sends SOL to referrers and pays the tx fees itself. The platform key never pays referrers. Rows written by the old platform-funded program (devnet only) are never paid by this job.

### Per-project example (k = 2: curve volume = 2 x the threshold, then migrates)
`feeModel(tier, "onchain", { volumeSol: 2 * threshold })`: curve fees + migration fee, cashback on all curve volume, referral account set on every swap. SOL per migrated coin, post-migration fees not included.

| Tier (threshold) | Curve volume | Fees paid | Creator | Platform net (after cashback) | incl. referral cut | Meteora | Cashback |
|---|---|---|---|---|---|---|---|
| Standard (85) | 170 | 1.70 | 0.68 | 1.513 | 0.068 | 0.442 | 0.085 |
| Higher (150) | 300 | 3.00 | 2.238 | 1.632 | 0.120 | 0.780 | 0.150 |
| Max (250) | 500 | 5.00 | 3.00 | 0.950 | 0.200 | 1.300 | 0.250 |

Without the referral cut (swaps made outside the Higher Bar UI) the platform net is 1.445 / 1.512 / 0.750 and Meteora 0.510 / 0.900 / 1.500. The platform net then splits 40/50/10. After migration the creator earns 0.60% / 0.65% / 0.70% of DAMM v2 volume on top.

### Comparison at 500 SOL curve volume (migrates at 85/150/250 SOL, anti-sniper OFF, referral active)
| | Creator | Platform ops | $BAR buyback | Treasury | Meteora | Trader pays |
|---|---|---|---|---|---|---|
| pump.fun (web app) | 1.5 | 7.015 (total) | - | - | - | 8.5 |
| StonkFun (unverified) | 0 | 1.5 | 2.25 | - | 1.25 (Raydium) | 5.0 |
| HB Standard (85 SOL) | 2.0 | 1.4 | 1.12 | 0.28 | 0.97 | 5.0 (4.75 after cashback) |
| HB Higher (150 SOL) | 3.23 | 1.11 | 0.888 | 0.222 | 1.1 | 5.0 (4.75) |
| HB Max (250 SOL) | 3.0 | 0.475 | 0.38 | 0.095 | 1.3 | 5.0 (4.75) |

Curve phase only (post-migration fees come on top). Creator fees at this volume are ~1.3x / 2.2x / 2.0x pump.fun's, and traders pay ~44% less than on pump.fun web. pump.fun graduates at ~85 SOL, the same as HB Standard. Migration fees scale with the target, so the migration shares above are larger than with the earlier 40/80/100 SOL example values (now devnet only).
## 6. $BAR buyback & burn
1. Claim platform fees (curve share, migration fee, DAMM v2 LP fees) into the treasury (a single wallet for now; multisig later). The referral cut lands in the referral wallet's WSOL account directly.
2. **Creator LP rebate** first: `LP_REBATE_BPS` (packages/shared, fixed per tier: Standard 6875, Higher 6875, Max 7500 bps) of the DAMM v2 LP SOL the platform actually claimed is forwarded to the token's on-chain DBC pool creator (`jobs:lprebate`, also run inside `jobs:epoch`; one row per claim in `creator_lp_rebates`, floor rounding, dust stays with the platform; paid per wallet once it reaches `LP_REBATE_MIN_PAYOUT_SOL`, default 0.01 SOL). Platform / treasury / referral wallets as creator are skipped.
3. Then trader cashback.
4. Split the rest: **40% buyback & burn, 50% operations, 10% treasury** (example split).
5. Scheduled bot buys $BAR via **Jupiter** in small capped orders, then burns.
6. Publish every buy and burn with **Solscan links** on a public tracker page.
- Example at 10,000 SOL/day curve volume (60/30/10 tier mix): traders pay 100 SOL fees, creators 44.88 (Higher at the on-chain 62%), cashback 5, Meteora 16, platform 34.12 (13.65 buyback, 17.06 ops, 3.41 treasury).
- Rebates, cashback and milestone payouts are sent by the platform keypair (user referral payouts are sent by the referral wallet from its own income, see section 5). Claimed fees go to `TREASURY_PUBKEY` when it differs from the platform key, so the platform key has to be topped up from the treasury to cover them (each payout checks its balance + 0.01 SOL first). If the treasury becomes a Squads vault, those top-ups become multisig proposals; this is not automated.
- **Never** promise price or market $BAR as an investment. Check legal rules for fee-linked tokens.

## 7. Phase 2 features
| Feature | How | Where | Difficulty |
|---|---|---|---|
| Higher Bar score | from tier, anti-sniper ON, dev lock, holder spread | off-chain (indexer) | medium |
| Dev wallet lock + badge | DBC `lockedVesting` or third-party locker | on-chain/3rd party | medium |
| Leaderboard | weekly top creators, traders, tokens; migrations and post-migration survival | off-chain | easy |
| User referral | reward referrers from the swap-referral income only (not the platform share) | off-chain | medium |
| $BAR utility | fee discount, bigger cashback, Max tier access, fee share | backend | medium |
| Milestone bonus | treasury pays creators whose token holds above an mcap for N days after migration | off-chain | medium |

## 8. Architecture
pnpm workspaces, TypeScript everywhere.
```
heiger-bar/
  packages/onchain/   # DBC config scripts, SDK wrappers, keeper bot
  packages/shared/    # types, constants (tiers, fees), utils
  apps/api/           # indexer + REST API + cron jobs (cashback, buyback)
  apps/web/           # Next.js app router + wallet-adapter + Tailwind
```
- SDK: `@meteora-ag/dynamic-bonding-curve-sdk`, `@solana/web3.js`, `@solana/spl-token`.
- Web: Next.js, `@solana/wallet-adapter-react`, Tailwind, lightweight-charts for price charts.
- API: Node + Fastify (or Express), SQLite via Drizzle/Prisma for MVP (Postgres later).
- Data: Helius (or any RPC) websockets / webhooks for pool and swap events.
- Metadata/images: IPFS (e.g. Pinata) or Arweave.

### Database tables
- `tokens` (mint, pool, config_id, tier, anti_sniper, creator, name, symbol, image_uri, created_at, migrated_at, damm_pool)
- `trades` (sig, mint, trader, side, sol_amount, token_amount, price, fee, ts, via_platform)
- `holders` (mint, wallet, balance, updated_at)
- `price_candles` (mint, interval, open, high, low, close, volume, ts)
- `cashback_ledger` (wallet, period, volume, amount, paid_sig)
- `referrals` (referrer, referee, created_at), `referral_rewards`, `referral_income` (per-day income ledger)
- `buybacks` (period, sol_spent, bar_bought, buy_sig, burn_sig)
- `scores` (mint, score, breakdown_json, updated_at)

### API endpoints
- `GET /tokens?sort=new|trending|bonding|migrated&tier=`
- `GET /tokens/:mint` (details, bonding progress %, score)
- `GET /tokens/:mint/trades`, `GET /tokens/:mint/candles?interval=`
- `GET /tokens/:mint/holders`
- `POST /metadata` (upload image + json to IPFS, returns uri)
- `GET /configs` (6 configs with tier + anti-sniper)
- `GET /leaderboard`, `GET /cashback/:wallet`, `GET /buybacks`

### Web pages
- `/` feed (new, trending, about to bond, migrated) with tier badges
- `/create` launch form: name, symbol, image, description, socials, **tier picker**, **anti-sniper toggle**, optional initial buy
- `/token/[mint]` chart, buy/sell panel, **bonding progress bar to chosen target**, Higher Bar badge, holders, trades
- `/leaderboard`, `/cashback`, `/burn` (buyback tracker), `/about` (credits ContextChain)

### Bots / jobs
- **Indexer:** subscribe to DBC program events, write trades, holders, candles.
- **Migration keeper:** watch pools; when quote reserve hits threshold, call migrate to DAMM v2 immediately (trading pauses until migrated).
- **Fee claimer:** claim platform fees from DBC and DAMM v2 positions into treasury.
- **Cashback job:** compute per-wallet volume per period, pay out.
- **Buyback job:** Jupiter buy $BAR with capped size, burn, record proofs.

### Env vars
`RPC_URL`, `RPC_WS_URL`, `NETWORK=devnet`, `PLATFORM_KEYPAIR_PATH`, `TREASURY_PUBKEY`, `REFERRAL_ACCOUNT`, `CONFIG_STANDARD_OFF` ... `CONFIG_MAX_ON` (6 config pubkeys), `DATABASE_URL`, `PINATA_JWT`, `HELIUS_API_KEY`, `BAR_MINT`.
Web (all server-side, read at runtime; no `NEXT_PUBLIC_*` vars): `API_URL` (server-only; the browser calls the same-origin `/hb-api/*` proxy, `apps/web/app/hb-api/[...path]/route.ts`, which forwards to it, and SSR fetches use it directly), `PROXY_SHARED_SECRET` (must match the api), and `RPC_URL` / `NETWORK`, which the root layout reads on the server and passes to the browser wallet providers.

## 9. Security
- Never commit secrets or keypairs (`.env`, `*.json` keypairs in `.gitignore`); ship `.env.example`.
- Devnet first; mainnet only after review.
- Treasury and fee claim authority on a multisig (e.g. Squads).
- Validate all metadata inputs; rate-limit API; basic anti-spam on token creation.

## 10. Testing
- Unit tests for fee math (shared constants vs simulation table above).
- Devnet integration: create configs, launch token per config, buy/sell, push to threshold, keeper migrates, verify DAMM v2 pool and LP split.
- Anti-sniper ON: verify fee decays over time.

## 11. Deployment
- Web on Vercel; API + bots on Railway (or any Node host) with a persistent DB.
- Separate devnet and mainnet envs.

## 12. Step-by-step Cursor Agent prompts
Paste one at a time. Move on only when acceptance criteria pass.

**Step 1 - Monorepo setup**
> Read BUILD_BRIEF.md. Set up the pnpm TypeScript monorepo from section 8 (packages/onchain, packages/shared, apps/api, apps/web), with tsconfig, eslint, prettier, .gitignore, .env.example with all env vars from section 8. Put tier and fee constants from sections 4-5 in packages/shared.
> Done when: `pnpm install` and `pnpm -r typecheck` pass.

**Step 2 - DBC configs**
> Read BUILD_BRIEF.md sections 4-5. In packages/onchain, using @meteora-ag/dynamic-bonding-curve-sdk, write a script that creates the 6 DBC configs on devnet with the exact fee, migration, LP and anti-sniper settings. Verify every parameter name against the current Meteora docs and SDK. Save created config pubkeys to a JSON file and print them.
> Done when: script runs on devnet with a funded keypair and 6 config pubkeys are saved.

**Step 3 - Launch and trade SDK wrappers**
> In packages/onchain, add functions: createToken(configId, metadata, initialBuy?), buy, sell, getPoolState/bondingProgress, all setting the platform referral account. Add a devnet test script that launches a token on each config and does a buy and sell.
> Done when: test script succeeds on devnet.

**Step 4 - Migration keeper**
> Add a keeper bot in packages/onchain that watches all pools created from our configs and triggers migration to DAMM v2 as soon as the threshold is reached, with retries and logging.
> Done when: a devnet token pushed to its threshold gets migrated automatically.

**Step 5 - Indexer + API**
> Build apps/api: indexer for DBC pool/swap events, DB schema from section 8, and the REST endpoints listed there, plus IPFS metadata upload.
> Done when: launching and trading on devnet shows up via the API within seconds.

**Step 6 - Web app**
> Build apps/web with Next.js + wallet-adapter + Tailwind: feed, /create (tier picker + anti-sniper toggle), /token/[mint] with chart, buy/sell, bonding progress bar to the chosen target and Higher Bar badge. Fast, clean, pump.fun-level UX.
> Done when: full launch -> trade -> migrate flow works in the browser on devnet.

**Step 7 - Fees, cashback, buyback**
> Add fee claimer, cashback job, and $BAR buyback & burn job (section 6) in apps/api, with the /cashback and /burn pages showing Solscan proofs. Use a mock BAR mint on devnet.
> Done when: jobs run on devnet and pages show records.

**Step 8 - Phase 2**
> Implement section 7 features: score, dev lock badge, leaderboard, user referral, milestone bonus, $BAR utility.

**Step 9 - Hardening**
> Add tests from section 10, rate limiting, error handling, README with setup and deploy steps from section 11.

## 13. Sources
- https://docs.meteora.ag/core-products/dbc/launch-configurations
- https://docs.meteora.ag/core-products/dbc/fees
- https://docs.meteora.ag/overview/products/dbc/migration
- https://docs.meteora.ag/core-products/damm-v2/fees/overview
- https://docs.meteora.ag/protocol/protocol-revenues
- https://github.com/MeteoraAg/ts-sdk/blob/main/packages/dynamic-bonding-curve/docs.md
- https://pump.fun/docs/fees
- Concept page: https://cursor.com/canvas/store-09055b41-8012-48f8-b484-125bde33b666/4427cf40-4102-450d-bc6a-f805540c7379
