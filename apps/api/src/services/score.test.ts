import { test } from "node:test";
import assert from "node:assert/strict";
import { computeScore, SCORE_MAX } from "./score.js";

const now = 1_800_000_000;
const flat = (n: number, each = 1_000_000) => Array.from({ length: n }, () => each);

test("bare standard token with one holder scores low", () => {
  const r = computeScore({ tier: "standard", antiSniper: false, lock: null, balances: [5_000_000], nowSec: now });
  assert.equal(r.breakdown.tier, 10); assert.equal(r.breakdown.devLock, 0); assert.equal(r.breakdown.top10Pct, 100);
  assert.ok(r.score < 20 && r.label === "Early", String(r.score));
});

test("max tier + anti-sniper + long 10% lock + wide spread reaches 100", () => {
  const r = computeScore({ tier: "max", antiSniper: true, lock: { lockedTokens: 100_000_000, unlockAt: now + 365 * 86400 }, balances: flat(400), nowSec: now });
  assert.equal(r.breakdown.devLock, SCORE_MAX.devLock); assert.equal(r.breakdown.spread, SCORE_MAX.spread);
  assert.equal(r.score, 100); assert.equal(r.label, "Higher Bar");
});

test("expired or empty locks give no credit; short locks give partial credit", () => {
  const base = { tier: "higher" as const, antiSniper: false, balances: flat(20), nowSec: now };
  assert.equal(computeScore({ ...base, lock: { lockedTokens: 1e8, unlockAt: now - 1 } }).breakdown.devLock, 0);
  assert.equal(computeScore({ ...base, lock: { lockedTokens: 0, unlockAt: now + 1e7 } }).breakdown.devLock, 0);
  const half = computeScore({ ...base, lock: { lockedTokens: 25_000_000, unlockAt: now + 45 * 86400 } }).breakdown; // 45/90 days, 2.5/5 %
  assert.equal(half.devLock, 12.5); assert.equal(half.lockedPct, 2.5); assert.equal(half.lockDaysLeft, 45);
});

test("concentration: a whale caps spread points", () => {
  const even = computeScore({ tier: "standard", antiSniper: false, lock: null, balances: flat(100), nowSec: now }).breakdown;
  const whale = computeScore({ tier: "standard", antiSniper: false, lock: null, balances: [1e9, ...flat(99)], nowSec: now }).breakdown;
  assert.equal(even.top10Pct, 10); assert.ok(whale.top10Pct > 90);
  assert.ok(even.spread > whale.spread + 15, `${even.spread} vs ${whale.spread}`);
  assert.equal(computeScore({ tier: "standard", antiSniper: false, lock: null, balances: [], nowSec: now }).breakdown.spread, 0);
});
