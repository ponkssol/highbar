# Devnet migration test (1 SOL threshold)

Goal: prove the full curve -> DAMM v2 migration path cheaply, without filling a 40 SOL curve.

## 1. Test config
1. Copy the `standard_off` tier params (`buildTierConfig("standard", false)` in `packages/onchain/src/createConfigs.ts`).
2. Override `migrationQuoteThreshold` to **1 SOL** (1_000_000_000 lamports); keep everything else (FeeSchedulerExponential, MET_DAMM_V2, MigrationFeeOption.Customizable, LP split 20/80 creator/platform, permanent lock).
3. Create it with the platform keypair, save the key as `test_1sol` in `configs.devnet.json` (keep it out of the indexer's 6 tier keys, or accept that it shows up).

## 2. Launch
```
pnpm --filter @hb/onchain launch --name "Mig Test" --symbol MIGT --uri https://example.com/m.json --tier standard --anti off
```
(point it at the `test_1sol` config, e.g. temporarily via `configPubkey` / `--config` override).

## 3. Fill the curve
Buy **0.4 SOL** repeatedly with `SwapMode.PartialFill` (`buildSwapTx(..., { partialFill: true })` / `quoteSwap(..., partialFill=true)`) until
`poolState.quoteReserve >= 1e9`. PartialFill lets the last buy stop exactly at the threshold instead of failing.
Check: `client.state.getPool(pool)` -> `quoteReserve`, or `GET /tokens/:mint` on the API (`progress` = 1).

## 4. Migrate
```
DRY_RUN=false pnpm --filter @hb/onchain keeper      # no --loop = single pass (--once)
```
Keeper: createLocker if vesting needs it, then `migrateToDammV2` with `DAMM_V2_CONFIG` env or
`DAMM_V2_MIGRATION_FEE_ADDRESS[config.migrationFeeOption]` from the pool's on-chain config.

## 5. Verify
- `poolState.isMigrated != 0`; API emits a `graduate` activity.
- DAMM v2 pool exists: `deriveDammV2PoolAddress(dammConfig, baseMint, WSOL)`, fetch with `@meteora-ag/cp-amm-sdk` `CpAmm.fetchPoolState`.
- Two positions (NFT keypairs from the migrate tx): creator **20%** / platform **80%** of LP, both **permanently locked**
  (`CpAmm.getUserPositionByPool(pool, owner)` -> `permanentLockedLiquidity > 0`, `unlockedLiquidity == 0`).
- Explorer: https://explorer.solana.com/address/<dammPool>?cluster=devnet