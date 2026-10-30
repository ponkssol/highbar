# Higher Bar ($BAR) - Full Concept & Build Brief

> **Untuk Aes:** File ini isinya konsep lengkap plus panduan build. Buka chat Agent di Cursor (Ctrl+L, mode Agent), lalu tempel prompt di bagian 12 satu per satu, step demi step. Angka yang ditandai (example) masih contoh atau belum terverifikasi.

---

## 1. Concept
**Higher Bar** is a pump.fun-style Solana memecoin launchpad where **creators choose their own bonding/migration target** at launch, instead of a fixed ~85 SOL (~$40-50k mcap). Higher targets mean deeper liquidity at migration and a "raise the bar" culture.
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

## 5. Fee model (approved)
**Bonding curve, per trade:** 1% total. Meteora protocol takes 20% (0.2%). Remaining 0.8% split:

| Tier | creatorTradingFeePercentage | Creator | Platform |
|---|---|---|---|
| Standard | 50% | 0.4% | 0.4% |
| Higher | 62% | 0.496% | 0.304% |
| Max | 75% | 0.6% | 0.2% |

**Migration fee (% of migrated quote):** Standard 1% (creator 0%), Higher 1% (creator 50%), Max 0% (creator 0%). Meteora also takes a fixed 0.2% of liquidity at migration. These are the on-chain values: DBC fee percentages are whole-number u8s, so the earlier targets (Higher 62.5% creator trading share, Standard 1.5%, Max 0.5% migration fee at 50% creator) cannot be set on a config.

**After migration (DAMM v2):** pool fee 1%. DAMM v2 takes a 20% protocol cut (0.2% of volume), so LP holders receive 0.8%. LP split creator/platform, permanently locked: Standard 20/80, Higher 40/60, Max 50/50, so the creator earns 0.16% / 0.32% / 0.40% of post-migration volume and the platform 0.64% / 0.48% / 0.40%. (DBC rule: at least 10% must stay locked after 1 day.)

**Pool creation fee:** 0 (free launch).

**Referral:** set the platform's own referral account on every swap from our UI. It earns 20% of Meteora's protocol fee (= 4% of total fee), paid from Meteora's share, not from creator/platform.

**Trader cashback:** 0.05% of volume, paid by the platform off-chain (not native to DBC).

### Simulation per token (example: 500 SOL curve volume, reaches migration at the mainnet targets 85/150/250 SOL, anti-sniper OFF, referral active)
| | Creator | Platform ops | $BAR buyback | Treasury | Meteora | Trader pays |
|---|---|---|---|---|---|---|
| pump.fun (web app) | 1.5 | 7.015 (total) | - | - | - | 8.5 |
| StonkFun (unverified) | 0 | 1.5 | 2.25 | - | 1.25 (Raydium) | 5.0 |
| HB Standard (85 SOL) | 2.0 | 1.4 | 1.12 | 0.28 | 0.97 | 5.0 (4.75 after cashback) |
| HB Higher (150 SOL) | 3.23 | 1.11 | 0.888 | 0.222 | 1.1 | 5.0 (4.75) |
| HB Max (250 SOL) | 3.0 | 0.475 | 0.38 | 0.095 | 1.3 | 5.0 (4.75) |

Curve phase only (post-migration DAMM v2 LP fees come on top). Creators earn ~1.3x / 2.2x / 2.0x pump.fun. Traders pay ~44% less than pump.fun web. pump.fun graduates at ~85 SOL, the same as HB Standard. Migration fees scale with the target, so the creator and platform migration shares above are larger than with the earlier 40/80/100 SOL example values (now devnet only). All numbers use the on-chain fee values (see `ONCHAIN_PERCENT_NOTE`).

## 6. $BAR buyback & burn
1. Claim platform fees (curve share, migration fee, DAMM v2 LP fees, referral cut) into a **multisig treasury**.
2. Pay trader cashback first.
3. Split the rest: **40% buyback & burn, 50% operations, 10% treasury** (example split).
4. Scheduled bot buys $BAR via **Jupiter** in small capped orders, then burns.
5. Publish every buy and burn with **Solscan links** on a public tracker page.
- Example at 10,000 SOL/day curve volume (60/30/10 tier mix): traders pay 100 SOL fees, creators 44.88 (Higher at the on-chain 62%), cashback 5, Meteora 16, platform 34.12 (13.65 buyback, 17.06 ops, 3.41 treasury).
- **Never** promise price or market $BAR as an investment. Check legal rules for fee-linked tokens.

## 7. Phase 2 features
| Feature | How | Where | Difficulty |
|---|---|---|---|
| Higher Bar score | from tier, anti-sniper ON, dev lock, holder spread | off-chain (indexer) | medium |
| Dev wallet lock + badge | DBC `lockedVesting` or third-party locker | on-chain/3rd party | medium |
| Leaderboard | weekly top creators, traders, tokens; migrations and post-migration survival | off-chain | easy |
| User referral | reward referrers from platform share | off-chain | medium |
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
- `referrals` (referrer, referee, created_at), `referral_rewards`
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
`RPC_URL`, `RPC_WS_URL`, `NETWORK=devnet`, `PLATFORM_KEYPAIR_PATH`, `TREASURY_PUBKEY`, `REFERRAL_ACCOUNT`, `CONFIG_STANDARD_OFF` ... `CONFIG_MAX_ON` (6 config pubkeys), `DATABASE_URL`, `PINATA_JWT`, `HELIUS_API_KEY`, `BAR_MINT`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_RPC_URL`.

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
