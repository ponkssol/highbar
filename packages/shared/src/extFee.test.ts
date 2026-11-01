import { test } from "node:test";
import assert from "node:assert/strict";
import { EXT_FEE_BPS, extFeeLamports } from "./index.js";

test("extension fee: 2 bps (0.02%), floored, bigint-safe", () => {
  assert.equal(EXT_FEE_BPS, 2);
  assert.equal(extFeeLamports(0), 0n);
  assert.equal(extFeeLamports(0n), 0n);
  // floor(a * 2 / 10000): the fee is 0 below 5000 lamports, 1 lamport from 5000 to 9999
  assert.equal(extFeeLamports(4999), 0n);
  assert.equal(extFeeLamports(5000), 1n);
  assert.equal(extFeeLamports(9999), 1n);
  assert.equal(extFeeLamports(10000), 2n);
  assert.equal(extFeeLamports(1_000_000_000), 200_000n); // 1 SOL -> 0.0002 SOL
  assert.equal(extFeeLamports(100_000_000n), 20_000n); // 0.1 SOL
  assert.equal(extFeeLamports(123_456_789), 24_691n); // 24691.3578 floored
  assert.equal(extFeeLamports(20_000_000_000), 4_000_000n); // 20 SOL (dev buy max)
  // number and bigint agree; u64 max does not lose precision
  for (const n of [1, 4999, 5000, 5001, 7777, 99_999, 2 ** 53 - 1]) assert.equal(extFeeLamports(n), extFeeLamports(BigInt(n)));
  const u64 = 2n ** 64n - 1n;
  assert.equal(extFeeLamports(u64), (u64 * 2n) / 10000n);
});

test("extension fee: refuses negative and non-integer amounts", () => {
  assert.throws(() => extFeeLamports(-1), RangeError);
  assert.throws(() => extFeeLamports(-1n), RangeError);
  assert.throws(() => extFeeLamports(1.5), RangeError);
  assert.throws(() => extFeeLamports(Number.NaN), RangeError);
  assert.throws(() => extFeeLamports(2 ** 53), RangeError);
});
