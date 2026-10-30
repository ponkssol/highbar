import { test } from "node:test";
import assert from "node:assert/strict";
import { ANTI_SNIPER, ANTI_SNIPER_SCHEDULE, CURVE_FEE_BPS, antiSniperElapsed, feeAfterPeriods, scheduleDurationSeconds, scheduleEndFeeBps, scheduledFeeBps, type FeeSchedule } from "./index.js";

test("anti-sniper schedule: 2500 bps exponential over 60 x 1 s, ends at the 1% curve fee", () => {
  const s = ANTI_SNIPER_SCHEDULE;
  assert.equal(s.cliffFeeBps, ANTI_SNIPER.startFeeBps);
  assert.equal(scheduleDurationSeconds(s), ANTI_SNIPER.decaySeconds);
  assert.equal(scheduledFeeBps(s, 0), 2500);
  assert.equal(scheduledFeeBps(s, 0.99), 2500, "fee only steps at whole periods");
  assert.ok(Math.abs(scheduledFeeBps(s, 1) - 2500 * 0.9478) < 1e-9);
  assert.ok(Math.abs(scheduleEndFeeBps(s) - CURVE_FEE_BPS) < 1, `end ${scheduleEndFeeBps(s)}`);
  assert.equal(scheduledFeeBps(s, 10_000), scheduleEndFeeBps(s), "capped at numberOfPeriod");
  assert.equal(scheduledFeeBps(s, -5), 2500, "before activation = cliff");
  // exponential decays much faster than a straight line: at 10 s it is well under the linear 2100 bps
  assert.ok(scheduledFeeBps(s, 10) < 1500);
  let prev = Infinity;
  for (let t = 0; t <= 60; t++) { const f = scheduledFeeBps(s, t); assert.ok(f < prev); prev = f; }
});

test("linear and slot schedules", () => {
  const lin: FeeSchedule = { cliffFeeBps: 1000, numberOfPeriod: 10, periodFrequency: 2, reductionFactor: 50, mode: "linear", activationType: "timestamp" };
  assert.equal(scheduledFeeBps(lin, 5), 900);
  assert.equal(scheduleEndFeeBps(lin), 500);
  assert.equal(feeAfterPeriods(lin, 99), 500);
  const slot: FeeSchedule = { ...lin, activationType: "slot", periodFrequency: 10 };
  assert.equal(scheduleDurationSeconds(slot), 40, "10 periods x 10 slots x 0.4 s");
  assert.equal(scheduledFeeBps(slot, 4), 950);
});

test("elapsed is clamped to [0, duration] from the launch time", () => {
  assert.equal(antiSniperElapsed(1_000, 990), 10);
  assert.equal(antiSniperElapsed(1_000, 2_000), 0);
  assert.equal(antiSniperElapsed(1_000_000, 1_000), 60);
});
