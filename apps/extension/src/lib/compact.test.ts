import { test } from "node:test";
import assert from "node:assert/strict";
import { compactNum, compactPct, compactSol } from "./compact";

test("compact numbers: K/M/B/T with short decimals", () => {
  assert.equal(compactNum(410_170), "410.2K"); assert.equal(compactNum(3_400_000), "3.4M"); assert.equal(compactNum(12_345_678_901), "12.35B");
  assert.equal(compactNum(999.123), "999.12"); assert.equal(compactNum(1.5e15), "1,500T"); assert.equal(compactNum(-2500, true), "−2.5K"); assert.equal(compactNum(null), "—");
});
test("compact SOL: decimals by size, dust with a zero count", () => {
  assert.equal(compactSol(0.018), "0.018"); assert.equal(compactSol(-0.003, true), "−0.003"); assert.equal(compactSol(0.003, true), "+0.003");
  assert.equal(compactSol(12.3456), "12.35"); assert.equal(compactSol(1234.5), "1,235"); assert.equal(compactSol(98_765_432), "98.77M");
  assert.equal(compactSol(0.0042), "0.0042"); assert.equal(compactSol(0.0000123), "0.0₄12"); assert.equal(compactSol(0), "0.000");
  assert.equal(compactSol(Number.NaN), "—");
});
test("compact percent", () => {
  assert.equal(compactPct(-14.62), "−14.6%"); assert.equal(compactPct(2.04), "+2.0%"); assert.equal(compactPct(1234.5), "+1235%"); assert.equal(compactPct(123_456), "+123.5K%"); assert.equal(compactPct(null), "");
});
test("cost amounts stay short (3 significant digits, 3 decimals from 1 SOL)", async () => {
  const { short, extraCosts, costsText } = await import("./costs");
  assert.equal(short(246_913n), "0.000247"); assert.equal(short(100_000n), "0.0001"); assert.equal(short(7_219_946_671n), "7.22"); assert.equal(short(1n), "0.000000001"); assert.equal(short(0n), "0");
  assert.equal(costsText(extraCosts(0.0001, { enabled: true, bps: 2 } as never, 36_099_733_355_000n)), "Priority 0.0001 · highbar fee 0.02% 7.22 · Extra 7.22 SOL");
});
