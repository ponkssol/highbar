import { test } from "node:test";
import assert from "node:assert/strict";
import { memo, timer } from "./memo";

test("memo reuses a value within ttl, refetches after, forgets failures", async () => {
  const c = memo<number>(1000);
  let n = 0;
  const f = () => Promise.resolve(++n);
  assert.equal(await c.get("a", f, 0), 1);
  assert.equal(await c.get("a", f, 500), 1);
  assert.equal(await c.get("a", f, 1500), 2);
  const bad = c.get("b", () => Promise.reject(new Error("x")), 0);
  await assert.rejects(bad);
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(c.has("b", 1), false);
  assert.equal(await c.get("b", f, 2), 3);
});

test("timer keeps the first mark per step", () => {
  let t = 100;
  const tm = timer(() => t);
  t = 130; tm.mark("build"); t = 150; tm.mark("build"); t = 400; tm.mark("send");
  assert.deepEqual(tm.marks(), { build: 30, send: 300 });
});
