import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildCandles, parseRange, RangeError400, TF_MS } from "./candles.js";
import { TradeStore } from "./store.js";
import { tradeRowToPoint } from "./index.js";

const M = 60_000;
const tp = (ts: number, priceSol: number, amount = 1, ixIdx = 0, sig = `s${ts}`) => ({ mint: "m", sig, ixIdx, ts, priceSol, amount, side: "buy" as const });

test("parseRange: UTC-aligned, defaults to 500 buckets", () => {
  const r = parseRange({ tf: "5m", to: String(1000 * 300_000 + 123) });
  assert.equal(r.to, 1000 * 300_000); assert.equal((r.to - r.from) / r.step + 1, 500);
  assert.equal(parseRange({ tf: "1h", from: String(3_600_000 + 5), to: String(7_200_000 + 5) }).from, 3_600_000);
});
test("parseRange: rejects bad tf, reversed range, >5000 buckets", () => {
  assert.throws(() => parseRange({ tf: "2m" }), RangeError400);
  assert.throws(() => parseRange({ tf: "1m", from: "200000", to: "100000" }), RangeError400);
  assert.throws(() => parseRange({ tf: "1m", from: "0", to: String(5000 * M) }), RangeError400);
  assert.doesNotThrow(() => parseRange({ tf: "1m", from: "0", to: String(4999 * M) }));
  assert.throws(() => parseRange({ tf: "1m", to: "abc" }), RangeError400);
  assert.deepEqual(Object.keys(TF_MS), ["1m", "5m", "15m", "1h", "4h", "1d"]);
});
test("buildCandles: OHLCV, seed from previous trade, gap fill with v=0", () => {
  const trades = [tp(-30_000 + 10 * M, 1), tp(10 * M + 1, 2, 3), tp(10 * M + 2, 5, 1), tp(10 * M + 3, 4, 2), tp(13 * M, 3, 1)];
  const c = buildCandles(trades, 10 * M, 13 * M, M, 100);
  assert.equal(c.length, 4);
  assert.deepEqual([c[0].o, c[0].h, c[0].l, c[0].c, c[0].v, c[0].n], [2, 5, 2, 4, 6, 3]);
  assert.equal(c[0].vSol, 2 * 3 + 5 + 4 * 2);
  assert.deepEqual([c[1].o, c[1].h, c[1].l, c[1].c, c[1].v, c[1].n], [4, 4, 4, 4, 0, 0]);
  assert.equal(c[2].c, 4); assert.equal(c[3].o, 3); assert.equal(c[3].cUsd, 300);
  // seeded: bucket with no trades but a trade before from
  const s = buildCandles([tp(5 * M, 7)], 10 * M, 11 * M, M, 1);
  assert.equal(s.length, 2); assert.equal(s[0].o, 7); assert.equal(s[0].v, 0);
  // no history at all -> leading empty buckets omitted
  assert.equal(buildCandles([tp(12 * M, 1)], 10 * M, 12 * M, M, 1).length, 1);
});
test("TradeStore: dedupe sig+ixIdx, sorted, atomic persist", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hbc-")), f = path.join(dir, "trades.json");
  const s = new TradeStore(f, -1);
  assert.equal(s.add(tp(2000, 1, 1, 0, "a")), true);
  assert.equal(s.add(tp(2000, 1, 1, 0, "a")), false);
  assert.equal(s.add(tp(1000, 1, 1, 1, "a")), true);
  assert.deepEqual(s.trades("m").map((x) => x.ts), [1000, 2000]);
  s.flush();
  assert.equal(fs.readdirSync(dir).filter((x) => x.endsWith(".tmp")).length, 0);
  assert.equal(new TradeStore(f, -1).size, 2);
});
test("tradeRowToPoint: splits sig:ix and computes price", () => {
  const p = tradeRowToPoint({ sig: "abc:2", mint: "m", side: "sell", sol: 0.5, tokens: 1000, ts: 1 })!;
  assert.deepEqual([p.sig, p.ixIdx, p.priceSol], ["abc", 2, 0.0005]);
  assert.equal(tradeRowToPoint({ sig: "x:0", mint: "m", side: "buy", sol: 0, tokens: 0, ts: 1 }), null);
});