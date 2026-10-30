import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateFeeSchedulerEndingBaseFeeBps, BaseFeeMode } from "@meteora-ag/dynamic-bonding-curve-sdk";
import { TIERS, ANTI_SNIPER, CURVE_FEE_BPS, DAMM_V2_POOL_FEE_BPS, thresholdSolFor, type TierId } from "@hb/shared";
import { buildTierConfig } from "./createConfigs.js";
import { CONFIG_ENV, loadConfigs, rpcUrl, testConfigEntries } from "./client.js";

const LAMPORTS = 1_000_000_000n;
const tiers = Object.keys(TIERS) as TierId[];

test("6 configs: tier economics match TIERS (threshold, creator fee, migration fee, LP split, DAMM v2 fee)", () => {
  for (const id of tiers) for (const anti of [false, true]) {
    const t = TIERS[id];
    const c: any = buildTierConfig(id, anti);
    const tag = `${id}_${anti ? "on" : "off"}`;
    assert.equal(BigInt(c.migrationQuoteThreshold.toString()), BigInt(t.migrationQuoteThresholdSol) * LAMPORTS, tag);
    assert.equal(c.creatorTradingFeePercentage, t.creatorTradingFeePercentage, tag);
    assert.equal(c.migrationFee.feePercentage, t.migrationFeePercentage, tag);
    assert.equal(c.migrationFee.creatorFeePercentage, t.creatorMigrationFeePercentage, tag);
    assert.equal(c.partnerPermanentLockedLiquidityPercentage, t.lpPlatformPercentage, tag);
    assert.equal(c.creatorPermanentLockedLiquidityPercentage, t.lpCreatorPercentage, tag);
    assert.equal(c.partnerPermanentLockedLiquidityPercentage + c.creatorPermanentLockedLiquidityPercentage + c.partnerLiquidityPercentage + c.creatorLiquidityPercentage, 100, tag);
    assert.equal(c.migratedPoolFee.poolFeeBps, DAMM_V2_POOL_FEE_BPS, tag);
    assert.equal(c.migrationOption, 1, `${tag}: migrates to DAMM v2`);
    assert.equal(c.tokenUpdateAuthority, 1, `${tag}: immutable token authority`);
  }
});

test("thresholds per network: devnet keeps 40/80/100 SOL, mainnet (default) 85/150/250 SOL", () => {
  const sol = (id: TierId, net?: "devnet" | "mainnet") => Number(BigInt((buildTierConfig(id, false, undefined, net) as any).migrationQuoteThreshold.toString()) / LAMPORTS);
  assert.deepEqual(tiers.map((id) => sol(id, "devnet")), [40, 80, 100], "devnet");
  assert.deepEqual(tiers.map((id) => sol(id, "mainnet")), [85, 150, 250], "mainnet");
  assert.deepEqual(tiers.map((id) => sol(id)), [85, 150, 250], "default is mainnet");
  for (const id of tiers) { assert.equal(thresholdSolFor(id, "devnet"), sol(id, "devnet")); assert.equal(thresholdSolFor(id, "mainnet"), sol(id, "mainnet")); assert.equal(TIERS[id].migrationQuoteThresholdSol, sol(id)); }
  assert.equal(Number(BigInt((buildTierConfig("higher", false, 1, "devnet") as any).migrationQuoteThreshold.toString()) / LAMPORTS), 1, "test override still wins");
});

test("anti-sniper: exponential scheduler from startFeeBps decaying to the 1% curve fee; off = flat 1%", () => {
  const on: any = buildTierConfig("standard", true).poolFees.baseFee;
  const off: any = buildTierConfig("standard", false).poolFees.baseFee;
  assert.equal(on.baseFeeMode, BaseFeeMode.FeeSchedulerExponential);
  assert.equal(Number(on.cliffFeeNumerator) / 1e5, ANTI_SNIPER.startFeeBps, "start fee bps");
  assert.equal(Number(off.cliffFeeNumerator) / 1e5, CURVE_FEE_BPS);
  assert.equal(Number(off.firstFactor), 0, "no decay periods when off");
  const periods = Number(on.firstFactor), r = Number(on.thirdFactor);
  assert.equal(periods * Number(on.secondFactor), ANTI_SNIPER.decaySeconds, "decay duration");
  // fee after n periods = start * (1 - r/10000)^n: strictly decreasing, ends ~1%
  let prev = Infinity;
  for (let n = 0; n <= periods; n++) { const f = ANTI_SNIPER.startFeeBps * (1 - r / 10_000) ** n; assert.ok(f < prev); prev = f; }
  assert.ok(Math.abs(prev - CURVE_FEE_BPS) <= 2, `ends at ~${CURVE_FEE_BPS} bps, got ${prev}`);
  const sdkEnd = Number(calculateFeeSchedulerEndingBaseFeeBps(Number(on.cliffFeeNumerator), periods, Number(on.secondFactor), r, BaseFeeMode.FeeSchedulerExponential));
  assert.ok(Math.abs(sdkEnd - CURVE_FEE_BPS) <= 2, `SDK ending fee ${sdkEnd}`);
});

test("mainnet config loading: never falls back to configs.devnet.json; CONFIG_* env wins", () => {
  const saved = { ...process.env };
  try {
    process.env.NETWORK = "mainnet";
    for (const v of Object.values(CONFIG_ENV)) delete process.env[v];
    delete process.env.RPC_URL;
    const file = loadConfigs();
    for (const k of Object.keys(CONFIG_ENV)) assert.equal(file[k], undefined, `${k} must not come from the devnet file`);
    process.env.CONFIG_MAX_ON = "11111111111111111111111111111112";
    assert.equal(loadConfigs().max_on, "11111111111111111111111111111112");
    assert.deepEqual(testConfigEntries(), []);
    assert.ok(!/devnet/.test(rpcUrl()), "mainnet rpc default is not devnet");
    process.env.NETWORK = "devnet";
    assert.ok(Object.keys(loadConfigs()).length >= 6, "devnet still reads configs.devnet.json");
  } finally { process.env = saved; }
});
