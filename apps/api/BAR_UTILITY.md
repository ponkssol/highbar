# $HIGHER utility (BUILD_BRIEF step 8, section 7)

Holder perks by $HIGHER balance: bigger cashback, fee discount (as a rebate), Max tier access, holder fee share.
Everything here is **off-chain** (API + jobs). The mint comes from one resolver (`src/services/officialToken.ts`): `BAR_MINT` when set (manual override), otherwise the first launch by `OFFICIAL_TOKEN_CREATOR` with symbol `OFFICIAL_TOKEN_SYMBOL` (default `HIGHER`), recorded once by the indexer (or set by the admin override). Until $HIGHER exists every perk is off and the step 7 behaviour is unchanged.

## Tiers (`packages/shared` `BAR_TIERS`, example thresholds)

| Tier | Hold | Cashback | Fee rebate | Max tier launches | Fee share |
|---|---|---|---|---|---|
| None | 0 | 1x (0.05%) | - | no | no |
| Holder | 10,000 | 1.5x (0.075%) | - | no | yes |
| Raiser | 100,000 | 2x (0.10%) | +0.05% | yes | yes |
| Maxi | 1,000,000 | 3x (0.15%) | +0.10% | yes | yes |

Balance = sum of the wallet's token accounts for `BAR_MINT` (legacy SPL or Token-2022), read on-chain
(`getTokenAccountsByOwner`) and cached `BAR_BALANCE_CACHE_MS` (60s).

## What is (not) on-chain

| Perk | Where | Why |
|---|---|---|
| Fee discount | cashback rebate (`feeRebateBps` of via_ui volume) | DBC trading fees are fixed per config; a pool can't charge a different fee per trader. A per-holder discount at swap time would need extra configs per holder tier (and tokens can't move between configs) or a custom program. |
| Bigger cashback | cashback job (`computeAccruals` boost) | cashback is already off-chain (brief section 5). |
| Max tier access | `POST /tx/launch` returns 403 + `/launch` UI lock | DBC `createPool` is permissionless for any config, so someone calling the program directly can still use the Max configs. Only launches built by our API are gated. (Possible later: hide / un-badge Max tokens whose creator didn't qualify.) |
| Fee share | accrual ledger + payout job | paid in SOL from the platform keypair; payouts need `BAR_FEE_SHARE_LIVE=true` (legal review: brief section 6 warns about fee-linked tokens). |

## Anti-gaming: snapshots

`jobs:barsnap` stores a holder snapshot (one `getProgramAccounts` on the mint's token program; only balances >= the Holder
threshold are stored). For a period, a wallet's tier = its **minimum** balance over all snapshots in that UTC day (missing from
one = below threshold). Run it hourly, e.g. `pnpm --filter @hb/api jobs:barsnap -- --live --loop 3600`.
If a period has no snapshots, the jobs fall back to *current* balances (gameable: buy before the job, sell after). Live runs refuse
that fallback when `BAR_REQUIRE_SNAPSHOTS=true` (default on mainnet): the cashback boost is skipped and the fee share errors.

## Cashback boost (backward compatible)

`computeAccruals(p, exclude, boost?)`: without `boost` the result is exactly step 7. With it, each wallet gets
`bonus = base * (multiplier - 1) + volume * feeRebateBps`. `cashback_ledger.amount_lamports` stays the **total** owed, so payouts
and the treasury waterfall (cashback first, then 40/50/10) need no change; `bonus_lamports`, `bar_tier`, `bar_balance_raw` (0005)
record the extra. The bonus is funded from platform fees like the base cashback (it reduces buyback/ops/treasury proportionally).

## Fee share

Per closed period: `pool = treasury_splits.ops_lamports * BAR_FEE_SHARE_BPS / 10000` (default 20% of the ops share = 10% of
net platform fees), split pro-rata by balance among on-curve wallets at Holder tier or above, excluding the platform keypair,
treasury, referral wallet, `CASHBACK_EXCLUDE_WALLETS` and `BAR_FEE_SHARE_EXCLUDE_WALLETS`. Off-curve owners (PDAs such as pool or
LP vaults) are skipped. Floor rounding; dust stays in ops.

```
pnpm --filter @hb/api jobs:feeshare -- --period 2026-10-29            # dry-run: plan + simulated payouts, writes nothing
pnpm --filter @hb/api jobs:feeshare -- --period 2026-10-29 --live     # needs the period's split closed (jobs:epoch --live) ; writes the ledger once
BAR_FEE_SHARE_LIVE=true ... --live                                    # also pays (simulate -> sign once -> pending_sig -> confirm)
```

Safety is the same as cashback: dry-run by default (`DRY_RUN`), RPC genesis hash must match `NETWORK`, mainnet sends need
`ALLOW_MAINNET=true`, every payout tx is simulated before sending, signed once, its signature stored as `pending_sig` before
sending and reconciled next run (never re-signed). Payout batches use `CASHBACK_BATCH` and `CASHBACK_MIN_PAYOUT_SOL`.

## API

- `GET /bar`: tiers, BAR mint, gate / fee share settings, the limits above.
- `GET /bar/:wallet`: balance, tier, next tier, Max access, fee share ledger (Solscan links), cashback bonus totals.
- `POST /tx/launch` with `tier: "max"`: 403 unless the creator holds `MAX_TIER_MIN_BAR` (fresh balance read) when the gate is on.

## Env

`BAR_MINT`, `BAR_BALANCE_CACHE_MS` (60000), `BAR_GATE_MAX_TIER` (default: on once $HIGHER exists), `OFFICIAL_TOKEN_CREATOR`, `OFFICIAL_TOKEN_SYMBOL` (HIGHER), `BAR_CASHBACK_BOOST` (true),
`BAR_REQUIRE_SNAPSHOTS` (default true on mainnet), `BAR_FEE_SHARE_BPS` (2000), `BAR_FEE_SHARE_LIVE` (false), `BAR_FEE_SHARE_EXCLUDE_WALLETS`.
