import { test } from "node:test";
import assert from "node:assert/strict";
import { clampPos, placeNear, readPos } from "./place";

const vp = { w: 1024, h: 721 }, size = { w: 376, h: 390 };
const btn = (left: number, top: number) => ({ left, top, right: left + 120, bottom: top + 26 });

test("opens above the button with the right edges lined up", () => {
  const p = placeNear(btn(600, 500), size, vp);
  assert.deepEqual(p, { left: 720 - 376, top: 500 - 8 - 390 });
});

test("goes below when there is no room above", () => {
  assert.deepEqual(placeNear(btn(600, 100), size, vp), { left: 344, top: 134 });
});

test("sits beside the button when neither above nor below fits, and stays inside the viewport", () => {
  const small = { w: 1024, h: 600 };
  const p = placeNear(btn(700, 280), size, small);
  assert.equal(p.left, 700 - 8 - 376);
  assert.ok(p.top >= 12 && p.top + size.h <= small.h - 12);
});

test("clamps a button near the left edge", () => {
  assert.equal(placeNear(btn(20, 600), size, vp).left, 12);
});

test("no anchor opens top right", () => {
  assert.deepEqual(placeNear(null, size, vp), { left: 1024 - 376 - 12, top: 12 });
});

test("a drag past any edge is clamped", () => {
  assert.deepEqual(clampPos({ left: -500, top: 9000 }, size, vp), { left: 12, top: 721 - 390 - 12 });
  assert.deepEqual(clampPos({ left: 5000, top: -40 }, size, vp), { left: 1024 - 376 - 12, top: 12 });
});

test("a drawer taller than the viewport keeps its top visible", () => {
  assert.equal(clampPos({ left: 100, top: 50 }, { w: 376, h: 900 }, vp).top, 12);
});

test("saved positions are validated", () => {
  assert.deepEqual(readPos({ left: 10.4, top: 20.6 }), { left: 10, top: 21 });
  assert.equal(readPos({ left: "x", top: 1 }), null);
  assert.equal(readPos(null), null);
});

test("CA popup: right of the timeline column, top-aligned with the pill, clamped", async () => {
  const { placeBeside, onScreen } = await import("./place");
  const pill = { left: 300, top: 200, right: 520, bottom: 222 }, col = { left: 250, top: 0, right: 850, bottom: 900 };
  const s = { w: 306, h: 600 };
  assert.deepEqual(placeBeside(pill, col, s, { w: 1400, h: 900 }), { left: 862, top: 200 });
  // low pill: same side, pulled up to stay on screen
  assert.deepEqual(placeBeside({ ...pill, top: 700, bottom: 722 }, col, s, { w: 1400, h: 900 }), { left: 862, top: 900 - 600 - 12 });
  // narrow window: no room right, room left of the column
  assert.deepEqual(placeBeside({ ...pill, left: 700, right: 900 }, { left: 640, top: 0, right: 1240, bottom: 900 }, s, { w: 1260, h: 900 }), { left: 640 - 12 - 306, top: 200 });
  // phone-ish: neither side, below the pill, then over it (clamped)
  assert.deepEqual(placeBeside(pill, { left: 0, top: 0, right: 700, bottom: 900 }, s, { w: 700, h: 900 }), { left: 300, top: 230 });
  const p = placeBeside({ ...pill, top: 500, bottom: 522 }, { left: 0, top: 0, right: 700, bottom: 900 }, s, { w: 700, h: 700 });
  assert.ok(p.left + s.w <= 700 - 12 && p.top >= 12 && p.top + s.h <= 700 - 12);
  // no column found: the tweet box stands in; no anchor: top right
  assert.deepEqual(placeBeside(pill, null, s, { w: 1400, h: 900 }), { left: 532, top: 200 });
  assert.deepEqual(placeBeside(null, null, s, { w: 1400, h: 900 }), { left: 1400 - 306 - 20, top: 60 });
  assert.ok(onScreen({ left: 900, top: 100 }, s, { w: 1400, h: 900 }) && !onScreen({ left: 1200, top: 100 }, s, { w: 1400, h: 900 }));
});
