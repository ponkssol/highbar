import { test } from "node:test";
import assert from "node:assert/strict";
import { CREATOR_TRADING_FEE_PCT, MIGRATION_FEE_PCT, TIERS, curveFeeSplit, feeModel, type TierId } from "./index.js";

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
  assert.deepEqual(b("standard"), { creatorTradingFeePercentage: 50, migrationFeePercentage: 1.5, creatorMigrationFeePercentage: 0 });
  assert.deepEqual(b("higher"), { creatorTradingFeePercentage: 62.5, migrationFeePercentage: 1, creatorMigrationFeePercentage: 50 });
  assert.deepEqual(b("max"), { creatorTradingFeePercentage: 75, migrationFeePercentage: 0.5, creatorMigrationFeePercentage: 50 });
  assert.deepEqual([TIERS.standard, TIERS.higher, TIERS.max].map((t) => [t.lpCreatorPercentage, t.lpPlatformPercentage]), [[20, 80], [40, 60], [50, 50]]);
});

test("per-trade curve split (bps of volume)", () => {
  const brief = { standard: [40, 40], higher: [50, 30], max: [60, 20] } as const;
  for (const id of Object.keys(brief) as TierId[]) {
    const s = curveFeeSplit(TIERS[id], "brief");
    near(s.creator, brief[id][0], `${id} creator`); near(s.platform, brief[id][1], `${id} platform`); near(s.protocol, 20, "protocol");
  }
  const h = curveFeeSplit(TIERS.higher); // on-chain 62%
  near(h.creator, 49.6, "higher on-chain creator"); near(h.platform, 30.4, "higher on-chain platform");
});

test("brief simulation table (500 SOL curve volume, migrated, referral, cashback)", () => {
  const table = {
    standard: { creator: 2.0, ops: 1.275, buyback: 1.02, treasury: 0.255, meteora: 0.88 },
    higher: { creator: 2.9, ops: 0.925, buyback: 0.74, treasury: 0.185, meteora: 0.96 },
    max: { creator: 3.25, ops: 0.6, buyback: 0.48, treasury: 0.12, meteora: 1.0 },
  } as const;
  for (const id of Object.keys(table) as TierId[]) {
    const m = feeModel(TIERS[id], "brief");
    near(m.traderPays, 5, `${id} trader pays`); near(m.traderPays - m.cashback, 4.75, `${id} after cashback`);
    for (const k of Object.keys(table[id]) as (keyof (typeof table)[TierId])[]) near(m[k], table[id][k], `${id} ${k}`);
    const total = m.creator + m.meteora + m.platformNet + m.cashback; // every lamport of fees is accounted for (+ Meteora's migration cut)
    near(total, m.traderPays + TIERS[id].migrationQuoteThresholdSol * 0.002 + (TIERS[id].migrationQuoteThresholdSol * TIERS[id].brief.migrationFeePercentage) / 100, `${id} conservation`);
  }
});

test("on-chain model differs from brief only where u8 rounding forces it", () => {
  const d = (id: TierId) => { const a = feeModel(TIERS[id]), b = feeModel(TIERS[id], "brief"); return { creator: a.creator - b.creator, platform: a.platformNet - b.platformNet }; };
  near(d("standard").creator, 0, "standard creator"); near(d("standard").platform, -0.2, "standard platform (1% vs 1.5% of 40 SOL)");
  near(d("higher").creator, -0.02, "higher creator (62% vs 62.5%)"); near(d("higher").platform, 0.02, "higher platform");
  near(d("max").creator, -0.25, "max creator (no migration fee)"); near(d("max").platform, -0.25, "max platform");
  assert.deepEqual(CREATOR_TRADING_FEE_PCT, { standard: 50, higher: 62, max: 75 });
  assert.deepEqual(MIGRATION_FEE_PCT, { standard: 1, higher: 1, max: 0 });
});
