import { test } from "node:test";
import assert from "node:assert/strict";
import { LEADERBOARD_KINDS, normalizeLeaderboard } from "./leaderboard.js";

const MINT = "TestMint1111111111111111111111111111111111";
const bad: unknown[] = [undefined, null, "", "oops", 42, {}, { error: "kind must be tokens|creators" }, { items: [] }, [null, 1, "x", [], {}]];

test("leaderboard: every tab -> [] for error bodies, null, wrong shapes and junk rows", () => {
  for (const kind of LEADERBOARD_KINDS) for (const p of bad) assert.deepEqual(normalizeLeaderboard(kind, p), [], `${kind} ${JSON.stringify(p)}`);
});

test("leaderboard: partial rows get safe defaults (no undefined nested reads)", () => {
  const tok = { mint: MINT, name: "Test Coin", symbol: "TEST" };
  const [s] = normalizeLeaderboard("scores", [{ ...tok, tier: "bogus", score: 40 }]);
  assert.equal(s.tier, "standard"); assert.equal(s.breakdown, null); assert.equal(s.label, null); assert.equal(s.volumeSol, 0); assert.equal(s.score, 40);
  const [s2] = normalizeLeaderboard("scores", [{ ...tok, breakdown: { tier: 20, label: "Solid" } }]);
  assert.deepEqual([s2.breakdown?.tier, s2.breakdown?.holders, s2.breakdown?.top10Pct, s2.label], [20, 0, 0, "Solid"]);
  const [t] = normalizeLeaderboard("tokens", [{ ...tok, volumeSol: "1", progress: NaN }]);
  assert.deepEqual([t.volumeSol, t.progress, t.trades, t.score, t.unlockAt], [0, 0, 0, null, null]);
  const [m] = normalizeLeaderboard("migrations", [{ ...tok, migratedAt: 5000, createdAt: 1000 }]);
  assert.equal(m.timeToMigrateMs, 4000);
  const [v] = normalizeLeaderboard("survivors", [{ ...tok }]);
  assert.deepEqual([v.survivedDays, v.ratioNow, v.nowMcapUsd, v.alive], [0, null, null, null]);
  assert.deepEqual(normalizeLeaderboard("creators", [{ creator: MINT }, { tokens: 3 }]), [{ creator: MINT, tokens: 0, graduated: 0, volumeSol: 0, feesEarnedSol: 0, avgScore: null }]);
  assert.deepEqual(normalizeLeaderboard("traders", [{ wallet: MINT, buys: 2 }]), [{ wallet: MINT, volumeSol: 0, trades: 0, buys: 2, sells: 0, lastTs: 0 }]);
});

test("leaderboard: a tab's rows rendered under another tab are dropped or defaulted, never crash", () => {
  // tokens rows fed to the scores renderer (the stale-tab bug): breakdown is null, not undefined.
  const rows = normalizeLeaderboard("scores", [{ mint: MINT, name: "Test Coin", symbol: "TEST", tier: "higher", volumeSol: 1, trades: 3 }]);
  assert.equal(rows.length, 1); assert.equal(rows[0].breakdown, null);
  // creators / traders rows have no mint -> dropped from token tabs.
  assert.deepEqual(normalizeLeaderboard("tokens", [{ creator: MINT, tokens: 1 }, { wallet: MINT, trades: 1 }]), []);
});