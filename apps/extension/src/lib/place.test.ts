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
