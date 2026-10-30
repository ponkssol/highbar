import { test } from "node:test";
import assert from "node:assert/strict";
import { BAR_TIERS, BPS, MAX_TIER_MIN_BAR, TRADER_CASHBACK_BPS, barTierOf } from "@hb/shared";
import { allocateFeeShare, baseCashback, cashbackBonus, feeShareMinRaw, feeSharePool, nextTier, rawToBar, tierForRaw } from "./barMath.js";

const D = 6, U = 10n ** 6n, bar = (n: number) => BigInt(n) * U;
const tier = (id: string) => BAR_TIERS.find((t) => t.id === id)!;

test("BAR_TIERS: ascending thresholds and monotonic perks", () => {
  for (let i = 1; i < BAR_TIERS.length; i++) {
    const a = BAR_TIERS[i - 1], b = BAR_TIERS[i];
    assert.ok(b.minBar > a.minBar && b.cashbackMultiplierBps >= a.cashbackMultiplierBps && b.feeRebateBps >= a.feeRebateBps);
  }
  assert.equal(BAR_TIERS[0].minBar, 0);
  assert.equal(BAR_TIERS[0].cashbackMultiplierBps, BPS); // no BAR = plain step-7 cashback
  assert.equal(MAX_TIER_MIN_BAR, BAR_TIERS.find((t) => t.maxTierAccess)!.minBar);
});

test("tierForRaw: exact bigint thresholds, matches barTierOf", () => {
  const holder = tier("holder").minBar;
  assert.equal(tierForRaw(0n, D).id, "none");
  assert.equal(tierForRaw(bar(holder) - 1n, D).id, "none");
  assert.equal(tierForRaw(bar(holder), D).id, "holder");
  assert.equal(tierForRaw(bar(MAX_TIER_MIN_BAR), D).maxTierAccess, true);
  assert.equal(tierForRaw(bar(10 ** 12), D).id, BAR_TIERS.at(-1)!.id);
  for (const t of BAR_TIERS) assert.equal(barTierOf(t.minBar).id, tierForRaw(bar(t.minBar), D).id);
  assert.equal(tierForRaw(10_000n * 10n ** 9n, 9).id, "holder"); // other decimals
});

test("rawToBar / nextTier", () => {
  assert.equal(rawToBar(1_500_000n, D), 1.5);
  const n = nextTier(bar(4_000), D)!;
  assert.equal(n.tier.id, "holder"); assert.equal(n.needBar, 6_000);
  assert.equal(nextTier(bar(10 ** 9), D), null);
});

test("cashbackBonus: none = 0 (backward compatible), multiplier + rebate on top of base", () => {
  const vol = 123_456_789_000n; // ~123 SOL
  assert.equal(baseCashback(vol), (vol * BigInt(TRADER_CASHBACK_BPS)) / BigInt(BPS));
  assert.equal(cashbackBonus(vol, tier("none")), 0n);
  for (const t of BAR_TIERS) {
    const base = baseCashback(vol), total = base + cashbackBonus(vol, t);
    assert.equal(total, (base * BigInt(t.cashbackMultiplierBps)) / BigInt(BPS) + (vol * BigInt(t.feeRebateBps)) / BigInt(BPS));
  }
  const s = 100_000_000_000n; // 100 SOL: base 0.05 SOL
  assert.equal(cashbackBonus(s, tier("holder")), 25_000_000n); // 1.5x -> +0.025
  assert.equal(cashbackBonus(s, tier("maxi")), 100_000_000n + 100_000_000n); // 3x -> +0.1, rebate 0.1% -> +0.1
});

test("fee share: pool from ops, pro-rata, threshold, floor never over-allocates", () => {
  assert.equal(feeSharePool(1_000_000_000n, 2000), 200_000_000n);
  const min = feeShareMinRaw(D);
  assert.equal(min, bar(tier("holder").minBar));
  const r = allocateFeeShare(1_000n, [["b", bar(20_000)], ["a", bar(10_000)], ["c", min - 1n], ["d", bar(30_000)]], min);
  assert.deepEqual(r.rows.map((x) => x.wallet), ["a", "b", "d"]);
  assert.deepEqual(r.rows.map((x) => x.amount), [166n, 333n, 500n]);
  assert.ok(r.allocated <= 1_000n);
  assert.equal(r.totalRaw, bar(60_000));
  assert.equal(allocateFeeShare(0n, [["a", bar(10_000)]], min).allocated, 0n);
  assert.equal(allocateFeeShare(5n, [], min).rows.length, 0);
});
