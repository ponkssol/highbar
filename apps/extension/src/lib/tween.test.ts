import { test } from "node:test";
import assert from "node:assert/strict";
import { ease, fmtUsdFixed, fmtUsdShort, tweenAt } from "./tween";

test("tween eases from start to end", () => {
  assert.equal(ease(0), 0); assert.equal(ease(1), 1); assert.equal(ease(2), 1);
  assert.ok(ease(0.5) > 0.5);
  assert.equal(tweenAt(100, 200, 0), 100); assert.equal(tweenAt(100, 200, 1), 200);
  const mid = tweenAt(100, 200, 0.5); assert.ok(mid > 150 && mid < 200);
});
test("fixed compact USD keeps its decimals", () => {
  assert.equal(fmtUsdFixed(12_000), "$12.0K"); assert.equal(fmtUsdFixed(12_340), "$12.3K");
  assert.equal(fmtUsdFixed(9_870), "$9.87K"); assert.equal(fmtUsdFixed(9_000), "$9.00K");
  assert.equal(fmtUsdFixed(1_230_000), "$1.23M"); assert.equal(fmtUsdFixed(123_456), "$123K");
  assert.equal(fmtUsdFixed(512), "$512"); assert.equal(fmtUsdFixed(5.5), "$5.50");
  assert.equal(fmtUsdFixed(null), "–");
});
test("short compact USD for pills", () => {
  assert.equal(fmtUsdShort(12_340), "$12.3K"); assert.equal(fmtUsdShort(8_000), "$8.0K"); assert.equal(fmtUsdShort(123_456), "$123K");
  assert.equal(fmtUsdShort(1_234_567), "$1.2M"); assert.equal(fmtUsdShort(512.4), "$512"); assert.equal(fmtUsdShort(null), "—");
});
