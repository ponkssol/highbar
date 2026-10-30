import { test } from "node:test";
import assert from "node:assert/strict";
import { METEORA_PROTOCOL_SHARE_PCT, MILESTONE_DEFAULTS, REFERRAL_FEE_BPS_OF_TRADE_FEE, REFERRAL_SHARE_OF_PROTOCOL, milestoneProgress, parseMilestones, planReferralPool, platformFeeLamports, referralFeeFromTradeFee } from "@hb/shared";
import { withinIncome } from "./referral.js";
import { dailyFromSnaps, dayOf, progressFor } from "./milestone.js";

test("platform fee share per tier (after 20% Meteora protocol cut)", () => {
  const fee = 1_000_000n; // 0.001 SOL total trading fee
  assert.equal(platformFeeLamports("standard", fee), 400_000n); // 80% x 50%
  assert.equal(platformFeeLamports("higher", fee), 304_000n); // 80% x 38%
  assert.equal(platformFeeLamports("max", fee), 200_000n); // 80% x 25%
  // fee missing -> estimated from volume at 1%
  assert.equal(platformFeeLamports("standard", 0n, 100_000_000n), 400_000n);
  assert.equal(platformFeeLamports("standard", 0n, 0n), 0n);
});

test("referral fee = 20% of Meteora's 20% protocol fee = 400 bps of the trade fee", () => {
  assert.equal(REFERRAL_FEE_BPS_OF_TRADE_FEE, Math.round(METEORA_PROTOCOL_SHARE_PCT * REFERRAL_SHARE_OF_PROTOCOL * 100));
  assert.equal(referralFeeFromTradeFee(1_000_000n), 40_000n); // 0.001 SOL fee (0.1 SOL trade) -> 0.00004 SOL = 0.04% of volume
  assert.equal(referralFeeFromTradeFee(24n), 0n);
});

const src = (referrer: string, volSol: number, refFee: bigint) => ({ referrer, volume: BigInt(volSol * 1e9), referralFee: refFee });
const inv = (p: ReturnType<typeof planReferralPool>) => assert.equal(p.allocated + p.carryOut + p.unallocated, p.income + p.carryIn);

test("referral pool: pro-rata by referees' volume, funded only by attributable income", () => {
  // 100 SOL of UI volume -> 0.04 SOL income; referred wallets did 30 + 10 SOL of it (0.012 + 0.004 SOL referral fee)
  const p = planReferralPool({ income: 40_000_000n, sources: [src("A", 30, 12_000_000n), src("B", 10, 4_000_000n)] });
  assert.equal(p.attributable, 16_000_000n);
  assert.equal(p.budget, 16_000_000n);
  assert.deepEqual(p.rows.map((r) => [r.referrer, r.amount]), [["A", 12_000_000n], ["B", 4_000_000n]]);
  assert.equal(p.unallocated, 24_000_000n); // non-referred income stays in the referral wallet
  assert.equal(p.carryOut, 0n); inv(p);
  // rewardBps 5000 -> half of the attributable income
  const h = planReferralPool({ income: 40_000_000n, sources: [src("A", 30, 12_000_000n), src("B", 10, 4_000_000n)], rewardBps: 5000 });
  assert.equal(h.allocated, 8_000_000n); inv(h);
});

test("referral pool: never more than income received; dust carries over", () => {
  // indexed referral fees say 16M but only 10M was received (e.g. some swaps had no usable referral account)
  const short = planReferralPool({ income: 10_000_000n, sources: [src("A", 30, 12_000_000n), src("B", 10, 4_000_000n)] });
  assert.equal(short.budget, 10_000_000n);
  assert.ok(short.allocated <= 10_000_000n); inv(short);
  // 3 equal referrers, 100 lamports budget -> 33 each, 1 lamport dust carried
  const d = planReferralPool({ income: 100n, sources: [src("A", 1, 100n), src("B", 1, 0n), src("C", 1, 0n)] });
  assert.deepEqual(d.rows.map((r) => r.amount), [33n, 33n, 33n]);
  assert.equal(d.carryOut, 1n); inv(d);
  // next epoch: carry-in is paid out on top
  const n = planReferralPool({ income: 0n, carryIn: 1n, sources: [src("A", 1, 0n)] });
  assert.equal(n.allocated, 1n); inv(n);
  // nobody referred: the carry waits, nothing is allocated
  const z = planReferralPool({ income: 500n, carryIn: 7n, sources: [] });
  assert.equal(z.allocated, 0n); assert.equal(z.carryOut, 7n); assert.equal(z.unallocated, 500n); inv(z);
  assert.throws(() => planReferralPool({ income: -1n, sources: [] }));
});

test("referral pool: total allocated over many epochs <= total income", () => {
  let carry = 0n, income = 0n, allocated = 0n, seed = 7;
  const rnd = (n: number) => (seed = (seed * 1103515245 + 12345) % 2147483648) % n;
  for (let e = 0; e < 200; e++) {
    const inc = BigInt(rnd(1_000_000));
    const sources = Array.from({ length: rnd(5) }, (_, k) => ({ referrer: "R" + k, volume: BigInt(rnd(1000) + 1), referralFee: BigInt(rnd(400_000)) }));
    const p = planReferralPool({ income: inc, carryIn: carry, sources, rewardBps: 10_000 });
    inv(p); income += inc; allocated += p.allocated; carry = p.carryOut;
    assert.ok(allocated <= income);
  }
});

test("withinIncome keeps payouts within the recorded income headroom", () => {
  const due = [{ wallet: "A", lamports: 50n, ref: ["d1"] }, { wallet: "B", lamports: 20n, ref: ["d1"] }, { wallet: "C", lamports: 40n, ref: ["d1"] }];
  const r = withinIncome(due, 65n);
  assert.deepEqual(r.due.map((d) => d.wallet), ["B", "C"]);
  assert.deepEqual(r.held.map((d) => d.wallet), ["A"]);
  assert.equal(withinIncome(due, 0n).due.length, 0);
  assert.equal(withinIncome(due, 110n).due.length, 3);
});

test("parseMilestones", () => {
  assert.deepEqual(parseMilestones(undefined), MILESTONE_DEFAULTS);
  assert.deepEqual(parseMilestones(" "), MILESTONE_DEFAULTS);
  assert.deepEqual(parseMilestones("a:100:3:0.5, b-2:2000:14:2"), [{ id: "a", mcapSol: 100, days: 3, rewardSol: 0.5 }, { id: "b-2", mcapSol: 2000, days: 14, rewardSol: 2 }]);
  for (const bad of ["a:100:3", "a:0:3:1", "a:100:0:1", "a:100:1.5:1", "a:100:400:1", "a:100:3:-1", "a b:100:3:1", "a:100:3:1,a:200:3:1"])
    assert.throws(() => parseMilestones(bad), Error, bad);
});

const m = { id: "t", mcapSol: 1000, days: 3, rewardSol: 1 };
const d = (day: string, minMcapSol: number, samples = 4) => ({ day, minMcapSol, samples });
test("milestoneProgress: consecutive days after migration day", () => {
  const days = [d("2026-01-01", 5000), d("2026-01-02", 1200), d("2026-01-03", 1000), d("2026-01-04", 1500), d("2026-01-05", 10)];
  const p = milestoneProgress(m, "2026-01-01", days);
  assert.equal(p.qualified, true);
  assert.equal(p.qualifiedDay, "2026-01-04"); // migration day itself never counts
  assert.equal(p.streak, 3);
});
test("milestoneProgress: a low day resets the streak, sparse days are skipped", () => {
  const days = [d("2026-01-02", 1200), d("2026-01-03", 999), d("2026-01-04", 1500), d("2026-01-05", 1500, 1), d("2026-01-06", 1500)];
  const p = milestoneProgress(m, "2026-01-01", days, 2);
  assert.equal(p.qualified, false);
  assert.equal(p.streak, 2);
  assert.equal(p.broken, 1);
  assert.equal(milestoneProgress(m, "2026-01-01", [...days, d("2026-01-07", 2000)], 2).qualifiedDay, "2026-01-07");
});

test("progressFor ignores the still-open UTC day", () => {
  const now = Date.parse("2026-01-05T12:00:00Z");
  assert.equal(dayOf(now), "2026-01-05");
  const days = [d("2026-01-02", 2000), d("2026-01-03", 2000), d("2026-01-04", 2000), d("2026-01-05", 2000)];
  const migratedAt = Date.parse("2026-01-01T10:00:00Z");
  const [p] = progressFor({ migratedAt }, days, [{ ...m, days: 4 }], now, 1);
  assert.equal(p.streak, 3);
  assert.equal(p.qualified, false);
  assert.equal(progressFor({ migratedAt }, days, [m], now, 1)[0].qualifiedDay, "2026-01-04");
});

test("dailyFromSnaps folds hourly DAMM snapshots into UTC days (lowest mcap, sample count)", () => {
  const h = (iso: string, mcapSol: number) => ({ ts: Date.parse(iso), mcapSol });
  assert.deepEqual(dailyFromSnaps([h("2026-01-02T23:00:00Z", 900), h("2026-01-02T01:00:00Z", 1500), h("2026-01-03T00:00:00Z", 2000), h("2026-01-02T12:00:00Z", 1200)]), [
    { day: "2026-01-02", minMcapSol: 900, samples: 3 },
    { day: "2026-01-03", minMcapSol: 2000, samples: 1 },
  ]);
  assert.deepEqual(dailyFromSnaps([]), []);
});
