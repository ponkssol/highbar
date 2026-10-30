import { test } from "node:test";
import assert from "node:assert/strict";
import { MILESTONE_DEFAULTS, milestoneProgress, parseMilestones, platformFeeLamports, referralRewardLamports } from "@hb/shared";
import { capAccruals, type RefAccrual } from "./referral.js";
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

test("referral reward is bps of the platform share", () => {
  assert.equal(referralRewardLamports(400_000n, 2000), 80_000n);
  assert.equal(referralRewardLamports(400_000n), 80_000n);
  assert.equal(referralRewardLamports(3n, 2000), 0n);
});

const acc = (referrer: string, amount: bigint): RefAccrual => ({ referrer, referees: 1, trades: 1, volume: 0n, platformFee: amount * 5n, amount });
test("capAccruals scales pro-rata to the ops cap", () => {
  const rows = [acc("a", 600n), acc("b", 400n)];
  assert.deepEqual(capAccruals(rows, null), { rows, capped: false });
  assert.deepEqual(capAccruals(rows, 1000n), { rows, capped: false });
  const c = capAccruals(rows, 500n);
  assert.equal(c.capped, true);
  assert.deepEqual(c.rows.map((r) => [r.referrer, r.amount]), [["a", 300n], ["b", 200n]]);
  assert.ok(c.rows.reduce((s, r) => s + r.amount, 0n) <= 500n);
  assert.deepEqual(capAccruals(rows, 0n).rows, []);
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
