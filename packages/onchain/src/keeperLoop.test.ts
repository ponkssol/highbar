import { test } from "node:test";
import assert from "node:assert/strict";
import { HotTracker, keeperLoopConfig, nextDelaySec, ttlCache } from "./keeperLoop.js";

const argv = (...a: string[]) => ["node", "keeper.ts", ...a];

test("loop interval: --loop N wins, else KEEPER_LOOP_SEC, else 900; no --loop = single pass", () => {
  assert.equal(keeperLoopConfig(argv(), {}).loopSec, 0);
  assert.equal(keeperLoopConfig(argv(), { KEEPER_LOOP_SEC: "600" }).loopSec, 0, "env alone does not start a loop");
  assert.equal(keeperLoopConfig(argv("--loop"), {}).loopSec, 900);
  assert.equal(keeperLoopConfig(argv("--loop"), { KEEPER_LOOP_SEC: "600" }).loopSec, 600);
  assert.equal(keeperLoopConfig(argv("--loop", "30"), { KEEPER_LOOP_SEC: "600" }).loopSec, 30, "explicit CLI value overrides the env");
  assert.equal(keeperLoopConfig(argv("--loop", "--x"), {}).loopSec, 900);
  for (const bad of ["0", "-5", "abc", ""]) assert.equal(keeperLoopConfig(argv("--loop"), { KEEPER_LOOP_SEC: bad }).loopSec, 900);
  assert.equal(keeperLoopConfig(argv("--loop", "abc"), { KEEPER_LOOP_SEC: "120" }).loopSec, 120);
});

test("fast lane: KEEPER_HOT_LOOP_SEC (30) never above the loop; KEEPER_HOT_PCT (0.9) capped at 1", () => {
  const c = keeperLoopConfig(argv("--loop"), {});
  assert.deepEqual(c, { loopSec: 900, hotSec: 30, hotPct: 0.9 });
  assert.equal(nextDelaySec(c, false), 900);
  assert.equal(nextDelaySec(c, true), 30);
  assert.equal(keeperLoopConfig(argv("--loop", "10"), {}).hotSec, 10);
  assert.equal(keeperLoopConfig(argv("--loop"), { KEEPER_HOT_LOOP_SEC: "60", KEEPER_HOT_PCT: "5" }).hotSec, 60);
  assert.equal(keeperLoopConfig(argv("--loop"), { KEEPER_HOT_PCT: "5" }).hotPct, 1);
});

test("HotTracker: hot while a curve near graduation still trades or a completed curve waits; idle otherwise", () => {
  const h = new HotTracker(0.9);
  const v = (pool: string, r: bigint, migrated = false) => ({ pool, quoteReserve: r, threshold: 100n, migrated });
  assert.equal(h.update([v("a", 10n), v("b", 50n)], 0), false, "far from the threshold");
  assert.equal(h.update([v("a", 95n)], 0), true, "a moved past 90%");
  assert.equal(h.update([v("a", 95n)], 0), false, "sits at 95% without trades: back to the slow loop");
  assert.equal(h.update([v("a", 97n)], 0), true, "traded again");
  assert.equal(h.update([v("a", 100n)], 1), true, "completed, migration pending");
  assert.equal(h.update([v("a", 100n, true)], 0), false, "migrated");
  assert.equal(h.update([v("c", 99n)], 0), true, "first sight near the threshold (e.g. keeper restart)");
  assert.equal(h.update([], 2), true, "pending live migrations alone keep it hot");
});

test("ttlCache: hits within ttl, reloads after, does not cache null", async () => {
  let now = 0, loads = 0;
  const c = ttlCache<string, number>(1_000, () => now);
  const load = async () => { loads++; return 7; };
  assert.equal(await c("k", load), 7); assert.equal(await c("k", load), 7); assert.equal(loads, 1);
  now = 1_000; await c("k", load); assert.equal(loads, 2);
  let nulls = 0; const nl = async () => { nulls++; return null; };
  await c("n", nl); await c("n", nl); assert.equal(nulls, 2);
});
