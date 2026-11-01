import { test } from "node:test";
import assert from "node:assert/strict";
import { backoff, chartSources, patchLive, ticksToBars, fmtPrice, gtOhlcvUrl, hbCandlesPath, isPumpMint, mergeBars, parseGt, parseHb, parsePump, pumpCandlesUrl, servedRes } from "./candles";

const PUMP = "CEMEy7jkeytkxq3qYjaKyQnKiUdHAMJDM1B1tv2Upump", POOL = "DykSdf3MduVEd6bmv4D5ZEaX1d4XN3XMVJYWyHFBH6Re", HB = "HbZ73YQ7UV3AQf2ZzhZrJYtzM937gJiCV2hFUmKxsKqz";

test("candles: sources in order (highbar api, pump.fun for any mint it knows, GeckoTerminal for a pool, live ticks)", () => {
  assert.ok(isPumpMint(PUMP) && !isPumpMint(HB) && !isPumpMint("pump"));
  assert.deepEqual(chartSources(PUMP, { pool: POOL }), ["pump.fun", "geckoterminal", "live"]);
  // a pump.fun coin with a vanity address (no "pump" suffix) still asks pump.fun
  assert.deepEqual(chartSources(HB, { pool: POOL }), ["pump.fun", "geckoterminal", "live"]);
  assert.deepEqual(chartSources(HB, { pool: POOL, pumpEmpty: true }), ["geckoterminal", "live"]);
  assert.deepEqual(chartSources(HB, { highbar: true, pool: POOL }), ["highbar", "geckoterminal", "live"]);
  assert.deepEqual(chartSources(HB, { pumpEmpty: true }), ["live"]);
  assert.deepEqual(chartSources(HB, { pool: "not a pool", pumpEmpty: true }), ["live"]);
  assert.deepEqual(chartSources("nope", {}), []);
  assert.equal(servedRes("live", "1m"), "1s");
  assert.equal(servedRes("pump.fun", "1s"), "1s");
  assert.equal(servedRes("geckoterminal", "1s"), "1m");
  assert.equal(servedRes("highbar", "5m"), "5m");
});

test("candles: URLs (pump.fun's chart route, GeckoTerminal minute ohlcv, the api's tf)", () => {
  assert.equal(pumpCandlesUrl(PUMP, "1s", 999), `https://frontend-api-v3.pump.fun/candles/solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/${PUMP}?res=1s&measure=price_usd&count=300`);
  assert.equal(gtOhlcvUrl(POOL, "5m", 300), `https://api.geckoterminal.com/api/v2/networks/solana/pools/${POOL}/ohlcv/minute?aggregate=5&limit=300&currency=usd`);
  assert.equal(gtOhlcvUrl(POOL, "1m", 50, PUMP), `https://api.geckoterminal.com/api/v2/networks/solana/pools/${POOL}/ohlcv/minute?aggregate=1&limit=50&currency=usd&token=${PUMP}`);
  assert.equal(gtOhlcvUrl(POOL, "1s", 300), null);
  assert.equal(gtOhlcvUrl("../x", "1m", 300), null);
  assert.equal(hbCandlesPath(HB, "1m", 10, 600_000), `/tokens/${HB}/candles?tf=1m&from=0`);
  assert.equal(hbCandlesPath(HB, "1s", 10), null);
});

test("candles: pump.fun page parses to sorted seconds, wrong served width is rejected", () => {
  const body = { candles: [
    { openTimeMs: 1793536346000, open: "0.000016634", high: "0.000016634", low: "0.000016195", close: "0.000016195", volumeUsd: "84.25", final: true },
    { openTimeMs: 1793536243000, open: "0.000016627", high: "0.000016629", low: "0.000016627", close: "0.000016629", volumeUsd: "0.377" },
    { openTimeMs: "bad", open: "1", high: "1", low: "1", close: "1" },
  ], hasOlder: true, served: { res: "1s", measure: "price_usd" } };
  const b = parsePump(body, "1s")!;
  assert.equal(b.length, 2);
  assert.deepEqual(b.map((x) => x.time), [1793536243, 1793536346]);
  assert.equal(b[1].volume, 84.25);
  assert.equal(parsePump({ ...body, served: { res: "1m" } }, "1s"), null);
  assert.equal(parsePump({ error: "x" }, "1s"), null);
});

test("candles: GeckoTerminal list (newest first, duplicate buckets merged) and api candles (USD, else SOL)", () => {
  const g = parseGt({ data: { attributes: { ohlcv_list: [[120, 2, 3, 1.5, 2.5, 10], [60, 1, 2, 1, 2, 5], [120, 2.5, 4, 2, 3, 1]] } } })!;
  assert.deepEqual(g, [{ time: 60, open: 1, high: 2, low: 1, close: 2, volume: 5 }, { time: 120, open: 2, high: 4, low: 1.5, close: 3, volume: 11 }]);
  const h = parseHb({ candles: [{ t: 60_000, o: 1, h: 2, l: 1, c: 2, vSol: 3, oUsd: 100, hUsd: 200, lUsd: 100, cUsd: 200, vUsd: 300 }, { t: 120_000, o: 2, h: 2, l: 2, c: 2, vSol: 0, oUsd: 0, hUsd: 0, lUsd: 0, cUsd: 0, vUsd: 0 }] })!;
  assert.deepEqual(h.map((x) => [x.time, x.close, x.volume]), [[60, 200, 300], [120, 2, 0]]);
});

test("candles: merge replaces the forming bar and appends, backoff caps at 30 s, tiny prices read", () => {
  const a = [{ time: 1, open: 1, high: 1, low: 1, close: 1, volume: 1 }, { time: 2, open: 1, high: 2, low: 1, close: 2, volume: 1 }];
  const m = mergeBars(a, [{ time: 2, open: 1, high: 3, low: 1, close: 3, volume: 4 }, { time: 3, open: 3, high: 3, low: 3, close: 3, volume: 1 }]);
  assert.deepEqual(m.map((x) => [x.time, x.close, x.volume]), [[1, 1, 1], [2, 3, 4], [3, 3, 1]]);
  assert.equal(backoff(1000, 0), 1000); assert.equal(backoff(1000, 3), 8000); assert.equal(backoff(1000, 50), 30_000);
  assert.equal(fmtPrice(0.000016629), "0.0₄1662");
  assert.equal(fmtPrice(1.5), "1.500");
  assert.equal(fmtPrice(0.05), "0.0500");
});

test("candles: live 1 s bars from price ticks, and the last history bar patched live", () => {
  const T = 1_700_000_000_000;
  const b = ticksToBars([{ t: T + 2500, p: 3 }, { t: T, p: 1 }, { t: T + 300, p: 2 }, { t: T + 1000, p: 0 }], 1);
  assert.deepEqual(b.map((x) => [x.time, x.open, x.high, x.low, x.close]), [[T / 1000, 1, 2, 1, 2], [T / 1000 + 2, 2, 3, 2, 3]]);
  const hist = [{ time: 1_699_999_920, open: 1, high: 1, low: 1, close: 1, volume: 5 }];
  assert.deepEqual(patchLive(hist, { t: T - 30_000, p: 2 }, 60)[0], { time: 1_699_999_920, open: 1, high: 2, low: 1, close: 2, volume: 5 });
  const next = patchLive(hist, { t: T + 1000, p: 0.5 }, 60);
  assert.equal(next.length, 2); assert.deepEqual([next[1].open, next[1].low, next[1].close], [1, 0.5, 0.5]);
  assert.equal(patchLive(hist, { t: T - 120_000, p: 9 }, 60), hist);
  assert.equal(patchLive(hist, null, 60), hist);
});
