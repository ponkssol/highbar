import { test } from "node:test";
import assert from "node:assert/strict";
import { CREATOR_TRADING_FEE_PCT, DEVNET_THRESHOLD_SOL, MAINNET_THRESHOLD_SOL, MIGRATION_FEE_PCT, TIERS, curveFeeSplit, feeModel, thresholdSolFor, lpFeeSplit, LP_REBATE_BPS, LP_REBATE_MIN_PAYOUT_FLOOR_SOL, LP_REBATE_MIN_PAYOUT_SOL, lpRebateLamports, postMigrationSplit, type TierId } from "./index.js";

const near = (a: number, b: number, msg: string) => assert.ok(Math.abs(a - b) < 1e-9, `${msg}: ${a} != ${b}`);

test("on-chain tier values are valid DBC u8 percentages", () => {
  for (const t of Object.values(TIERS)) {
    for (const v of [t.creatorTradingFeePercentage, t.migrationFeePercentage, t.creatorMigrationFeePercentage, t.lpCreatorPercentage, t.lpPlatformPercentage])
      assert.ok(Number.isInteger(v) && v >= 0 && v <= 100, `${t.id}: ${v}`);
    if (t.migrationFeePercentage === 0) assert.equal(t.creatorMigrationFeePercentage, 0, `${t.id}: creator migration fee must be 0 when the fee is 0`);
    assert.equal(t.lpCreatorPercentage + t.lpPlatformPercentage, 100, t.id);
  }
});

test("brief section 5 targets", () => {
  const b = (id: TierId) => TIERS[id].brief;
  assert.deepEqual(b("standard"), { creatorTradingFeePercentage: 50, migrationFeePercentage: 1, creatorMigrationFeePercentage: 0 });
  assert.deepEqual(b("higher"), { creatorTradingFeePercentage: 62, migrationFeePercentage: 1, creatorMigrationFeePercentage: 50 });
  assert.deepEqual(b("max"), { creatorTradingFeePercentage: 75, migrationFeePercentage: 0, creatorMigrationFeePercentage: 0 });
  for (const t of Object.values(TIERS)) assert.deepEqual(t.brief, { creatorTradingFeePercentage: t.creatorTradingFeePercentage, migrationFeePercentage: t.migrationFeePercentage, creatorMigrationFeePercentage: t.creatorMigrationFeePercentage }, `${t.id}: brief = on-chain`);
  assert.deepEqual([TIERS.standard, TIERS.higher, TIERS.max].map((t) => [t.lpCreatorPercentage, t.lpPlatformPercentage]), [[20, 80], [40, 60], [50, 50]]);
});

test("per-trade curve split (bps of volume)", () => {
  const brief = { standard: [40, 40], higher: [49.6, 30.4], max: [60, 20] } as const;
  for (const id of Object.keys(brief) as TierId[]) {
    const s = curveFeeSplit(TIERS[id], "brief");
    near(s.creator, brief[id][0], `${id} creator`); near(s.platform, brief[id][1], `${id} platform`); near(s.protocol, 20, "protocol");
  }
  const h = curveFeeSplit(TIERS.higher); // on-chain 62%
  near(h.creator, 49.6, "higher on-chain creator"); near(h.platform, 30.4, "higher on-chain platform");
});

test("brief simulation table (500 SOL curve volume, migrated at the mainnet 85/150/250 SOL targets, referral, cashback)", () => {
  assert.deepEqual([TIERS.standard, TIERS.higher, TIERS.max].map((t) => t.migrationQuoteThresholdSol), [85, 150, 250]);
  const table = {
    standard: { creator: 2.0, ops: 1.4, buyback: 1.12, treasury: 0.28, meteora: 0.97 },
    higher: { creator: 3.23, ops: 1.11, buyback: 0.888, treasury: 0.222, meteora: 1.1 },
    max: { creator: 3.0, ops: 0.475, buyback: 0.38, treasury: 0.095, meteora: 1.3 },
  } as const;
  for (const id of Object.keys(table) as TierId[]) {
    const m = feeModel(TIERS[id], "brief");
    near(m.traderPays, 5, `${id} trader pays`); near(m.traderPays - m.cashback, 4.75, `${id} after cashback`);
    for (const k of Object.keys(table[id]) as (keyof (typeof table)[TierId])[]) near(m[k], table[id][k], `${id} ${k}`);
    const total = m.creator + m.meteora + m.platformNet + m.cashback; // every lamport of fees is accounted for (+ Meteora's migration cut)
    near(total, m.traderPays + TIERS[id].migrationQuoteThresholdSol * 0.002 + (TIERS[id].migrationQuoteThresholdSol * TIERS[id].brief.migrationFeePercentage) / 100, `${id} conservation`);
  }
});

test("on-chain model equals the brief (brief aligned with the u8 on-chain values)", () => {
  for (const id of Object.keys(TIERS) as TierId[]) {
    const a = feeModel(TIERS[id]), b = feeModel(TIERS[id], "brief");
    for (const k of Object.keys(a) as (keyof typeof a)[]) near(a[k], b[k], `${id} ${k}`);
  }
  assert.deepEqual(CREATOR_TRADING_FEE_PCT, { standard: 50, higher: 62, max: 75 });
  assert.deepEqual(MIGRATION_FEE_PCT, { standard: 1, higher: 1, max: 0 });
});

test("post-migration DAMM v2 LP fees: 1% pool fee, 20% protocol, 0.8% to LP split 20/40/50% creator", () => {
  const want = { standard: [16, 64], higher: [32, 48], max: [40, 40] } as const;
  for (const id of Object.keys(want) as TierId[]) {
    const s = lpFeeSplit(TIERS[id]);
    near(s.total, 100, `${id} pool fee`); near(s.protocol, 20, `${id} protocol`); near(s.lp, 80, `${id} lp`);
    near(s.creator, want[id][0], `${id} creator LP bps`); near(s.platform, want[id][1], `${id} platform LP bps`);
    near(s.protocol + s.creator + s.platform, s.total, `${id} conservation`);
  }
});

test("thresholds per network: mainnet 85/150/250 SOL, devnet keeps 40/80/100 SOL", () => {
  assert.deepEqual(MAINNET_THRESHOLD_SOL, { standard: 85, higher: 150, max: 250 });
  assert.deepEqual(DEVNET_THRESHOLD_SOL, { standard: 40, higher: 80, max: 100 });
  for (const id of Object.keys(TIERS) as TierId[]) {
    assert.equal(thresholdSolFor(id, "devnet"), DEVNET_THRESHOLD_SOL[id]);
    for (const n of ["mainnet", "mainnet-beta", undefined, null]) assert.equal(thresholdSolFor(id, n), MAINNET_THRESHOLD_SOL[id], `${id} ${n}`);
    assert.equal(TIERS[id].migrationQuoteThresholdSol, MAINNET_THRESHOLD_SOL[id]);
  }
});

test("creator LP rebate: creator 0.60/0.65/0.70%, platform 0.20/0.15/0.10%, Meteora 0.20% of post-migration volume", () => {
  assert.deepEqual(LP_REBATE_BPS, { standard: 6875, higher: 6875, max: 7500 });
  const want = { standard: [60, 20], higher: [65, 15], max: [70, 10] } as const;
  for (const id of Object.keys(want) as TierId[]) {
    const s = postMigrationSplit(TIERS[id]);
    near(s.creator, want[id][0], `${id} creator`); near(s.platform, want[id][1], `${id} platform`); near(s.protocol, 20, `${id} Meteora`);
    near(s.creator + s.platform + s.protocol, 100, `${id} conservation`);
    near(s.creatorLp + s.rebate, s.creator, `${id} creator = LP share + rebate`);
  }
});

test("creator LP rebate is floored per claim (dust stays with the platform)", () => {
  assert.equal(lpRebateLamports("standard", 1_000_000_000n), 687_500_000n);
  assert.equal(lpRebateLamports("max", 1_000_000_000n), 750_000_000n);
  assert.equal(lpRebateLamports("standard", 3n), 2n); // 2.0625 -> 2
  assert.equal(lpRebateLamports("higher", 1n), 0n); // 0.6875 -> 0
  assert.equal(lpRebateLamports("max", 1_234_567n), 925_925n); // 925_925.25 -> 925_925
  assert.equal(lpRebateLamports("standard", 0n), 0n); assert.equal(lpRebateLamports("standard", -5n), 0n);
  assert.ok(LP_REBATE_MIN_PAYOUT_SOL >= LP_REBATE_MIN_PAYOUT_FLOOR_SOL);
});