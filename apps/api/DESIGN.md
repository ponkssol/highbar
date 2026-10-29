# Higher Bar — apps/api design (Step 5 + Step 7 draft)

> Status: draft, local only. The repo `ponkssol/heiger-bar` currently contains only `.gitattributes` (branch `main`), so BUILD_BRIEF.md could not be read; this follows PLAN.md. Re-align once the brief lands.

## Scope
- **Step 5 (apps/api)**: Helius webhook indexer → Postgres; REST: `/tokens` feed (new/bonding/migrated/volume, tier filter), `/tokens/:mint`, `/trades`, `/candles`, `/holders`; `POST /metadata` (multipart → Pinata IPFS, returns Metaplex-style JSON URI for DBC `createPool`).
- **Step 7**: fee claimer (DBC partner fees; TODO migration fee, DAMM v2 LP, Meteora referral), off-chain cashback 0.05% per epoch, waterfall split (cashback first → 40 buyback / 50 ops / 10 treasury), Jupiter buyback in capped orders + SPL burn, public `/burns` & `/treasury/splits`.

## Key choices
- Fastify + pg + plain SQL migrations (no ORM) — swap if brief prescribes Prisma/Drizzle.
- Idempotency via `(sig, ix_idx)` PKs; rewards only on `finalized` trades.
- Only tokens created with our 6 DBC configs are indexed.
- `via_ui` = swap carried our referral account (used for referral-fee accounting / optional cashback scope).
- All lamport math in `bigint`; rounding dust → treasury.
- `DRY_RUN=true` default; payouts stay `accrued` until admin approval; treasury = Squads multisig.

## Not done / TODO
- DBC event decoder (`indexer/decode.ts`) is a stub — needs DBC IDL event coder.
- Holder tracking from token balance deltas + reconcile job; mcap/vol_24h refresh job.
- Score, leaderboard, referral, milestone (later phase).
- SDK method names in feeClaimer to verify against installed SDK version. Code not typechecked/installed yet.

## Update 29 Okt 2026 (iteration 2)
- Monorepo: pnpm workspace (`packages/*`, `apps/*`); `packages/shared` holds fee constants (curve 1%, Meteora 20%, creator 50/62/75, migration 1/1/0%, cashback 5 bps, split 40/50/10). `apps/api` imports split + cashback constants from it.
- Decoder: real, using `DynamicBondingCurveIdl` (SDK 2.0.0) + Anchor `BorshCoder`. Reads emit_cpi self-CPI events (EVENT_IX_TAG) from outer+inner ixs; one swap emits EvtSwap/EvtSwap2/EvtSwap3, we keep the richest (EvtSwap3). Trader = `payer`, referral = `referral_token_account` from the swap ix; name/symbol/uri from `initialize_virtual_pool_*` args; migration from `migration_damm_v2` ix accounts (`virtual_pool`, `pool`). Smoke-tested against live mainnet DBC txs (read-only RPC).
- Defaults: cashback only `via_ui`, buyback max 1 SOL/order, slippage 100 bps, Pinata, multisig TBD (`TREASURY_PUBKEY`), DRY_RUN on.
- Fee claimer: partner trading fee, partner migration fee, DAMM v2 LP position fees.
- Typecheck clean (`pnpm -r typecheck`).

## Update iteration 3 (devnet e2e)
- `.env` (devnet, gitignored), migration `002_base_fees.sql` (configs.token_decimal/collect_fee_mode, trades.fee_base_amount/fee_value_lamports, fee_claims.base_mint/base_amount/value_lamports).
- Base-token fees valued at trade execution price (trades) / last indexed price (claims). Buyback burns actual ATA balance delta from the swap tx.
- Scripts: `scripts/seed-configs.ts` (read configs from chain), `scripts/backfill.ts` (pool history → DB), `scripts/smoke.ts` (dry-run checks).
- Local Postgres: embedded-postgres in /workspace/pgtool (port 5433, user/pass hb). Migrations: apply `migrations/*.sql` Up sections.
