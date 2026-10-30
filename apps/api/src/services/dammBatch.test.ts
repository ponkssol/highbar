import { test } from "node:test";
import assert from "node:assert/strict";
import { batchFetch, GMA_MAX, planDammReads } from "./dammBatch.js";

test("batchFetch: 100 keys per getMultipleAccounts call, results aligned, missing = null", async () => {
  const calls: number[] = [];
  const keys = Array.from({ length: 250 }, (_, i) => i);
  const out = await batchFetch(keys, async (chunk) => { calls.push(chunk.length); return chunk.map((k) => (k % 7 === 0 ? null : k * 2)); });
  assert.equal(GMA_MAX, 100);
  assert.deepEqual(calls, [100, 100, 50]);
  assert.equal(out.length, 250);
  assert.equal(out[0], null); assert.equal(out[1], 2); assert.equal(out[249], 498);
  assert.deepEqual(await batchFetch([], async () => { throw new Error("no call for no keys"); }), []);
  assert.deepEqual(await batchFetch([1, 2], async () => [5]), [5, null], "short answer = missing");
});

test("planDammReads: all graduated tokens once per hour bucket, fresh migrations (no pool yet) every run", () => {
  const g = [{ mint: "a", dammPool: "P1" }, { mint: "b", dammPool: null }, { mint: "c", dammPool: "P3" }];
  const H = 3_600_000, b = 500 * H;
  assert.deepEqual(planDammReads(g, b, null), { hourly: true, mints: ["a", "b", "c"] }, "first run after start");
  assert.deepEqual(planDammReads(g, b, b), { hourly: false, mints: ["b"] }, "same hour: only the token still missing its pool");
  assert.deepEqual(planDammReads(g, b + H, b), { hourly: true, mints: ["a", "b", "c"] }, "next hour");
  assert.deepEqual(planDammReads([{ mint: "a", dammPool: "P1" }], b, b), { hourly: false, mints: [] }, "nothing to read: no RPC");
});
