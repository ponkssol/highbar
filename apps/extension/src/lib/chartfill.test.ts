import { test } from "node:test";
import assert from "node:assert/strict";
import { alignBars, bodyBars, fillGaps, MAX_BARS, pricePerPx, shouldFit, type Bar } from "./candles";

const B = (time: number, o: number, c = o, v = 1): Bar => ({ time, open: o, high: Math.max(o, c), low: Math.min(o, c), close: c, volume: v });

test("gap fill: every empty second is a flat candle at the previous close, up to now, no gaps or duplicates", () => {
  const v = fillGaps([B(100, 1, 2), B(103, 2, 3), B(104, 3, 1)], 1, 107.9);
  assert.deepEqual(v.map((b) => b.time), [100, 101, 102, 103, 104, 105, 106, 107]);
  assert.deepEqual(v[1], { time: 101, open: 2, high: 2, low: 2, close: 2, volume: 0 });
  assert.equal(v[3].open, 2); assert.equal(v[3].close, 3); assert.equal(v[3].volume, 1); // real bars untouched
  assert.deepEqual(v.slice(5).map((b) => [b.open, b.high, b.low, b.close, b.volume]), [[1, 1, 1, 1, 0], [1, 1, 1, 1, 0], [1, 1, 1, 1, 0]]);
  for (let i = 1; i < v.length; i++) assert.equal(v[i].time - v[i - 1].time, 1);
});

test("gap fill: carries on as the clock moves with no trades (live stretch after the last bar)", () => {
  const h = [B(60, 1, 1.5)];
  assert.equal(fillGaps(h, 1, 60).length, 1);
  assert.equal(fillGaps(h, 1, 90.4).length, 31);
  const later = fillGaps(h, 1, 95);
  assert.equal(later.at(-1)!.time, 95); assert.equal(later.at(-1)!.close, 1.5);
  // a live trade in the current second replaces the flat bar of that second (same time, no duplicate)
  const withTrade = fillGaps([...h, B(95, 1.5, 1.7)], 1, 95.5);
  assert.equal(withTrade.filter((b) => b.time === 95).length, 1); assert.equal(withTrade.at(-1)!.close, 1.7);
});

test("gap fill: minutes too, and the fill is capped (an older bar only seeds the first close)", () => {
  const v = fillGaps([B(0, 1, 2), B(600, 2, 3)], 60, 1200);
  assert.deepEqual(v.map((b) => b.time), [0, 60, 120, 180, 240, 300, 360, 420, 480, 540, 600, 660, 720, 780, 840, 900, 960, 1020, 1080, 1140, 1200]);
  assert.equal(v[5].close, 2); assert.equal(v.at(-1)!.close, 3);
  const capped = fillGaps([B(0, 1, 5)], 1, 100_000, 50);
  assert.equal(capped.length, 50); assert.equal(capped[0].time, 100_000 - 49); assert.equal(capped[0].close, 5);
  assert.ok(fillGaps([B(0, 1)], 1, 1e9).length <= MAX_BARS);
});

test("alignment: bars snap to interval boundaries and merge inside one slot", () => {
  const a = alignBars([B(905, 1, 2), B(61, 1, 1.2), B(119, 1.2, 0.9), B(950, 2, 4)], 60);
  assert.deepEqual(a.map((b) => b.time), [60, 900]);
  assert.deepEqual([a[0].open, a[0].high, a[0].low, a[0].close, a[0].volume], [1, 1.2, 0.9, 0.9, 2]);
  assert.deepEqual([a[1].open, a[1].close, a[1].high], [1, 4, 4]);
  // 15m: an off-grid source still lands on :00/:15/:30/:45 and the fill starts on the grid
  const v = fillGaps([B(1000, 1), B(3700, 2)], 900, 3700);
  assert.ok(v.every((b) => b.time % 900 === 0)); assert.deepEqual(v.map((b) => b.time), [900, 1800, 2700, 3600]);
});

test("minimum body: every candle is drawn with a body; the close and the data stay exact", () => {
  const view = [B(1, 1, 1, 0), B(2, 1, 1.0000001), B(3, 1.2, 1.0000001), B(4, 1, 2)];
  const d = bodyBars(view, 0.01, "grey");
  for (const b of d) assert.ok(Math.abs(b.close - b.open) >= 0.01 - 1e-12 && b.high >= Math.max(b.open, b.close) && b.low <= Math.min(b.open, b.close));
  assert.equal(d[0].close, 1); assert.equal(d[0].open, 0.99); assert.equal(d[0].color, "grey"); // flat: small body under the price
  assert.equal(d[1].open, 1.0000001 - 0.01); assert.equal(d[1].color, undefined); // thin up body grows down from the close
  assert.equal(d[2].open, 1.2); // a real body taller than the minimum is untouched
  assert.deepEqual(d[3], { time: 4, open: 1, high: 2, low: 1, close: 2 });
  assert.deepEqual(view[0], B(1, 1, 1, 0)); // input not changed
  const dn = bodyBars([B(5, 1.000001, 1)], 0.01)[0];
  assert.equal(dn.open, 1.01); assert.equal(dn.high, 1.01); // thin down body grows up
});

test("price per pixel: visible bars only, a flat view keeps a minimum range; fit when the bars do not fill the width", () => {
  const view = [B(1, 100, 200), ...Array.from({ length: 10 }, (_, i) => B(2 + i, 1, 1.1))];
  assert.ok(Math.abs(pricePerPx(view, 10, 100) - 0.1 / 100) < 1e-12);
  assert.ok(Math.abs(pricePerPx([B(1, 5, 5)], 10, 100) - 5 * 0.002 / 100) < 1e-12);
  assert.equal(pricePerPx([], 10, 100), 0);
  assert.equal(shouldFit(20, 224, 6), true); assert.equal(shouldFit(300, 224, 6), false); assert.equal(shouldFit(0, 224, 6), false);
});
