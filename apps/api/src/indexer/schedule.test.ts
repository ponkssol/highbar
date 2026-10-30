import { test } from "node:test";
import assert from "node:assert/strict";
import { classify, collectSignatures, idleDelay, pollConfig, poolFingerprint, PollScheduler, prioritize, tickTxBudget, tradesPerPool, type PollConfig, type PoolView } from "./schedule.js";
import { chronological } from "./tradeOrder.js";

const S = 1_000, M = 60_000, H = 3_600_000;
const T0 = 1_800_000_000_000;
const cfg = (o: Partial<PollConfig> = {}): PollConfig => ({ ...pollConfig({}), ...o });
const view = (o: Partial<PoolView> = {}): PoolView => ({ createdAt: T0 - 24 * H, isMigrated: false, fingerprint: "a", ...o });

/** Drive the scheduler like startIndexer: one tick every baseMs; `onTick` may change the view; returns the poll times. */
function run(sched: PollScheduler, pool: string, from: number, to: number, v: (now: number) => PoolView, newSigs: (now: number) => number = () => 0) {
  const polls: number[] = [];
  for (let now = from; now <= to; now += sched.cfg.baseMs) {
    const pv = v(now);
    if (!sched.due(pool, pv, now)) continue;
    polls.push(now);
    sched.record(pool, pv, { newSigs: newSigs(now), backlog: false }, now);
  }
  return polls;
}

test("pollConfig: defaults, env overrides, invalid values fall back, INDEXER_ADAPTIVE=0 turns it off", () => {
  assert.deepEqual(pollConfig({}), { adaptive: true, baseMs: 30 * S, activeWindowMs: 15 * M, newPoolHotMs: 10 * M, idleMaxMs: 10 * M, migratedMs: H });
  const c = pollConfig({ INDEX_INTERVAL_MS: "20000", INDEXER_ACTIVE_WINDOW_MIN: "5", INDEXER_NEW_POOL_HOT_MIN: "3", INDEXER_IDLE_MAX_MS: "300000", INDEXER_MIGRATED_SWEEP_MS: "0" });
  assert.deepEqual(c, { adaptive: true, baseMs: 20 * S, activeWindowMs: 5 * M, newPoolHotMs: 3 * M, idleMaxMs: 5 * M, migratedMs: 0 });
  assert.equal(pollConfig({ INDEXER_IDLE_MAX_MS: "abc", INDEXER_ACTIVE_WINDOW_MIN: "-1" }).idleMaxMs, 10 * M);
  assert.equal(pollConfig({ INDEXER_ACTIVE_WINDOW_MIN: "-1" }).activeWindowMs, 15 * M);
  assert.equal(pollConfig({ INDEXER_IDLE_MAX_MS: "1000" }).idleMaxMs, 30 * S, "cap never below the tick");
  for (const v of ["0", "false", "OFF"]) assert.equal(pollConfig({ INDEXER_ADAPTIVE: v }).adaptive, false);
  assert.equal(pollConfig({ INDEXER_ADAPTIVE: "1" }).adaptive, true);
});

test("idleDelay doubles from the tick up to the cap", () => {
  const c = cfg();
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 50].map((n) => idleDelay(n, c) / S), [30, 60, 120, 240, 480, 600, 600, 600]);
});

test("classify: active window, new pool, migrated, idle", () => {
  const c = cfg();
  assert.equal(classify(view(), T0 - 5 * M, T0, c), "active");
  assert.equal(classify(view({ createdAt: T0 - 5 * M }), 0, T0, c), "new");
  assert.equal(classify(view({ createdAt: T0 - 11 * M }), 0, T0, c), "idle");
  assert.equal(classify(view({ isMigrated: true }), 0, T0, c), "migrated");
  assert.equal(classify(view({ isMigrated: true }), T0 - M, T0, c), "active", "just migrated: stays hot for late txs");
});

test("legacy mode (adaptive off): every pool every tick", () => {
  const s = new PollScheduler(cfg({ adaptive: false }));
  assert.equal(run(s, "P", T0, T0 + H, () => view()).length, 121);
});

test("idle pool backs off 30s, 60s, 2m, 4m, 8m, then every 10 min", () => {
  const s = new PollScheduler(cfg());
  const polls = run(s, "P", T0, T0 + 2 * H, () => view());
  const gaps = polls.slice(1).map((t, i) => (t - polls[i]) / S);
  assert.deepEqual(gaps.slice(0, 6), [60, 120, 240, 480, 600, 600]);
  assert.ok(gaps.every((g) => g <= 600));
  assert.ok(polls.length <= 16, `idle pool polled ${polls.length}x in 2h (legacy: 241)`);
});

test("a brand-new pool stays hot (every tick) for its first 10 minutes, then backs off", () => {
  const s = new PollScheduler(cfg());
  const created = T0;
  const polls = run(s, "P", T0, T0 + 30 * M, () => view({ createdAt: created }));
  const first10 = polls.filter((t) => t < created + 10 * M);
  assert.equal(first10.length, 20, "every 30 s while new");
  const after = polls.filter((t) => t >= created + 10 * M);
  assert.ok(after.length < 10 && after.length > 0);
});

test("trades keep a pool hot for the active window, then it backs off", () => {
  const s = new PollScheduler(cfg());
  const tradeUntil = T0 + 20 * M;
  const polls = run(s, "P", T0, T0 + H, () => view(), (now) => (now <= tradeUntil ? 1 : 0));
  const hot = polls.filter((t) => t <= tradeUntil + 15 * M);
  assert.equal(hot.length, 71, "every tick while trading and for 15 min after the last trade");
  const cold = polls.filter((t) => t > tradeUntil + 15 * M);
  assert.ok(cold.length <= 6, `backed off afterwards (${cold.length} polls in the last 25 min)`);
});

test("a burst on an idle pool is caught on the next tick (pool account changed), not after the backoff", () => {
  const s = new PollScheduler(cfg());
  let fp = "a";
  const polls = run(s, "P", T0, T0 + H, (now) => { if (now === T0 + 37 * M) fp = "b"; return view({ fingerprint: fp }); });
  assert.ok(polls.includes(T0 + 37 * M), "polled on the tick where the state changed");
  const st = s.state("P")!;
  assert.equal(st.lastActivityAt, T0 + 37 * M);
  // stays hot (every tick) for the active window even when the poll itself found nothing yet (RPC lag)
  const hot = polls.filter((t) => t >= T0 + 37 * M && t < T0 + 52 * M);
  assert.equal(hot.length, 30);
});

test("the safety-net sweep alone (no state change, e.g. failed txs) still reaches an idle pool within INDEXER_IDLE_MAX_MS", () => {
  const s = new PollScheduler(cfg());
  const polls = run(s, "P", T0, T0 + 3 * H, () => view());
  const gaps = polls.slice(1).map((t, i) => t - polls[i]);
  assert.ok(Math.max(...gaps) <= 10 * M);
});

test("migrated pools: polled when the migration lands, hot for the active window, then hourly; 0 = never", () => {
  const s = new PollScheduler(cfg());
  const migAt = T0 + 30 * M;
  const v = (now: number) => view({ isMigrated: now >= migAt, fingerprint: now >= migAt ? "migrated" : "a" });
  const polls = run(s, "P", T0, T0 + 5 * H, v);
  assert.ok(polls.includes(migAt), "the migration (pool account change) triggers a poll");
  const late = polls.filter((t) => t > migAt + 15 * M);
  const gaps = late.slice(1).map((t, i) => t - late[i]);
  assert.ok(gaps.length >= 3 && gaps.every((g) => g === H), `hourly sweep: ${gaps.map((g) => g / M)}`);

  const never = new PollScheduler(cfg({ migratedMs: 0 }));
  const p2 = run(never, "P", T0, T0 + 5 * H, () => view({ isMigrated: true, fingerprint: "m" }));
  assert.deepEqual(p2, [T0], "only the first-sight poll");
  // a later change of a migrated pool (e.g. a fee claim) still triggers one poll
  assert.equal(never.due("P", view({ isMigrated: true, fingerprint: "m2" }), T0 + 6 * H), true);
});

test("backlog: a pool with signatures left polls again on the next tick even when idle", () => {
  const s = new PollScheduler(cfg());
  const v = view();
  assert.equal(s.due("P", v, T0), true);
  s.record("P", v, { newSigs: 0, backlog: false }, T0);
  s.record("P", v, { newSigs: 0, backlog: false }, T0 + 60 * S); // streak 2
  assert.equal(s.due("P", v, T0 + 90 * S), false);
  s.record("P", v, { newSigs: 0, backlog: true }, T0 + 90 * S);
  assert.equal(s.due("P", v, T0 + 120 * S), true);
});

test("markHot (external trigger) makes the pool due on the next tick", () => {
  const s = new PollScheduler(cfg());
  const v = view();
  run(s, "P", T0, T0 + H, () => v);
  assert.equal(s.due("P", v, T0 + H + 30 * S), false);
  s.markHot("P", T0 + H + 30 * S);
  assert.equal(s.due("P", v, T0 + H + 30 * S), true);
});

test("poolFingerprint is stable and sees any field change (BN / PublicKey toJSON, bigint)", () => {
  const bn = (n: number) => ({ toJSON: () => n.toString(16) });
  const a = { poolState: { quoteReserve: bn(5), sqrtPrice: bn(7), isMigrated: 0, fee: 1n } };
  assert.equal(poolFingerprint(a), poolFingerprint({ poolState: { quoteReserve: bn(5), sqrtPrice: bn(7), isMigrated: 0, fee: 1n } }));
  assert.notEqual(poolFingerprint(a), poolFingerprint({ poolState: { ...a.poolState, fee: 2n } }));
  assert.notEqual(poolFingerprint(a), poolFingerprint({ poolState: { ...a.poolState, quoteReserve: bn(6) } }));
});

// ---- signature paging: no signature is lost however many land between two polls ----

type Sig = { signature: string; slot: number };
/** getSignaturesForAddress semantics: newest first; `before` / `until` exclusive; at most `limit`. */
function fakeRpc(chain: Sig[]) {
  let calls = 0;
  const fetch = async (o: { limit: number; until?: string; before?: string }) => {
    calls++;
    const desc = [...chain].reverse();
    let i = o.before ? desc.findIndex((s) => s.signature === o.before) + 1 : 0;
    const out: Sig[] = [];
    for (; i < desc.length && out.length < o.limit; i++) { if (desc[i].signature === o.until) break; out.push(desc[i]); }
    return out;
  };
  return { fetch, calls: () => calls };
}
const mkChain = (n: number, from = 0) => Array.from({ length: n }, (_, k) => ({ signature: `s${from + k}`, slot: Math.floor((from + k) / 3) }));

test("collectSignatures pages back to `until` (a 2,500-signature burst on one pool is fully returned)", async () => {
  const chain = mkChain(3000);
  const rpc = fakeRpc(chain);
  const r = await collectSignatures(rpc.fetch, "s499", 1000, 10);
  assert.equal(r.complete, true);
  assert.equal(r.sigs.length, 2500);
  assert.equal(r.sigs[0].signature, "s2999");
  assert.equal(r.sigs.at(-1)!.signature, "s500");
  assert.equal(rpc.calls(), 3);
  // the legacy call (limit 25, until only) would have returned only the newest 25
  assert.equal((await rpc.fetch({ limit: 25, until: "s499" })).length, 25);
});

test("collectSignatures: page budget exhausted = complete false; empty = one call", async () => {
  const rpc = fakeRpc(mkChain(100));
  const r = await collectSignatures(rpc.fetch, undefined, 10, 3);
  assert.equal(r.complete, false);
  assert.equal(r.sigs.length, 30);
  const e = fakeRpc(mkChain(10));
  const r2 = await collectSignatures(e.fetch, "s9", 1000, 10);
  assert.deepEqual(r2, { sigs: [], complete: true, pages: 1 });
});

test("poller cursor algorithm: oldest-first batches of TRADES_PER_POOL, cursor = last handled, bursts across idle gaps lose nothing", async () => {
  const chain: Sig[] = [];
  const rpc = fakeRpc(chain);
  const handled: string[] = [];
  let cursor: string | undefined;
  const poll = async (cap: number) => {
    const { sigs } = await collectSignatures(rpc.fetch, cursor, 1000, 10);
    const all = chronological(sigs);
    const batch = all.slice(0, cap);
    for (const s of batch) handled.push(s.signature);
    if (batch.length) cursor = batch.at(-1)!.signature;
    return all.length > batch.length;
  };
  let n = 0;
  const add = (k: number) => { chain.push(...mkChain(k, n)); n += k; };
  add(7); await poll(25);
  add(260); // burst while the pool was backed off
  while (await poll(25)) { /* backlog: next tick */ }
  add(3); add(1200); while (await poll(25)) { /* drain */ }
  assert.deepEqual(handled, chain.map((s) => s.signature));
});

test("TRADES_PER_POOL defaults to 100; INDEXER_TICK_MAX_TXS defaults to 300, 0 = no cap, junk falls back", () => {
  assert.equal(tradesPerPool({}), 100);
  assert.equal(tradesPerPool({ TRADES_PER_POOL: "25" }), 25);
  for (const v of ["0", "-3", "abc", ""]) assert.equal(tradesPerPool({ TRADES_PER_POOL: v }), 100);
  assert.equal(tickTxBudget({}), 300);
  assert.equal(tickTxBudget({ INDEXER_TICK_MAX_TXS: "50" }), 50);
  assert.equal(tickTxBudget({ INDEXER_TICK_MAX_TXS: "0" }), Number.POSITIVE_INFINITY);
  for (const v of ["-1", "abc", " "]) assert.equal(tickTxBudget({ INDEXER_TICK_MAX_TXS: v }), 300);
});

test("prioritize is a stable sort by rank", () => {
  assert.deepEqual(prioritize(["a2", "b1", "c0", "d2", "e0", "f1"], (x) => Number(x[1])), ["c0", "e0", "b1", "f1", "a2", "d2"]);
  assert.deepEqual(prioritize(["x", "y", "z"], (x) => (x === "z" ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY)), ["z", "x", "y"]);
});

/** One indexOnce tick the way poller.ts orders it: rank order, tick tx budget, new tokens (no db row) never held back. */
function tick(sched: PollScheduler, pools: string[], inDb: Set<string>, pending: Map<string, number>, budget: number, limit: number, now: number) {
  const order: string[] = [];
  for (const pool of prioritize(pools, (p) => sched.rank(p))) {
    const v = view({ fingerprint: `${pool}:${pending.get(pool) ?? 0}` });
    let due = sched.due(pool, v, now);
    if (due && budget <= 0 && inDb.has(pool)) { due = false; sched.defer(pool, now); }
    if (!due) { inDb.add(pool); continue; }
    const left = pending.get(pool) ?? 0, cap = inDb.has(pool) ? Math.max(1, Math.min(limit, budget)) : limit, handled = Math.min(left, cap);
    pending.set(pool, left - handled); budget -= handled; order.push(pool); inDb.add(pool);
    sched.record(pool, v, { newSigs: left, backlog: left > handled }, now);
  }
  return order;
}

test("a freshly launched pool is indexed at the top of its first tick, even when busy pools used up the tick budget", () => {
  const sched = new PollScheduler(cfg());
  const busy = Array.from({ length: 20 }, (_, i) => `busy${i}`);
  const inDb = new Set<string>(), pending = new Map<string, number>(busy.map((p) => [p, 1_000]));
  tick(sched, busy, inDb, pending, 300, 100, T0); // warm-up: every pool known and in the db
  pending.set("fresh", 40);
  const order = tick(sched, [...busy, "fresh"], inDb, pending, 300, 100, T0 + 30 * S);
  assert.equal(order[0], "fresh", "new pool first");
  assert.equal(pending.get("fresh"), 0, "its launch txs (incl. dev buy) indexed in the same tick");
});

test("tick budget: held-back pools go first next tick, so no pool starves under sustained load", () => {
  const sched = new PollScheduler(cfg());
  const pools = Array.from({ length: 10 }, (_, i) => `p${i}`);
  const inDb = new Set<string>(pools), pending = new Map<string, number>();
  const served = new Map<string, number>();
  for (let k = 0; k < 20; k++) {
    for (const p of pools) pending.set(p, (pending.get(p) ?? 0) + 50); // every pool gets 50 new txs per tick, budget fits 6 pools
    for (const p of tick(sched, pools, inDb, pending, 300, 100, T0 + k * 30 * S)) served.set(p, (served.get(p) ?? 0) + 1);
  }
  // 300-tx budget / 100 per pool = 3 pools per tick: a fair rotation serves each of the 10 pools 6 times in 20 ticks
  for (const p of pools) assert.ok((served.get(p) ?? 0) >= 5, `${p} served ${served.get(p)} of 20 ticks`);
});
