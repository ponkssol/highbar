import { test } from "node:test";
import assert from "node:assert/strict";
import { addEntry, pnl, position, readLedger, type LedgerEntry } from "./ledger";

const e = (side: "buy" | "sell", sol: number, raw: number, at: number, sig = `s${at}`): LedgerEntry => ({ sig, side, sol, raw: String(raw), decimals: 6, at });

test("ledger: average cost, sells reduce cost by their share", () => {
  const p = position([e("buy", 1, 1_000_000_000, 1), e("buy", 3, 1_000_000_000, 2), e("sell", 3, 1_000_000_000, 3)])!;
  assert.equal(p.raw, 1_000_000_000n); assert.equal(p.costSol, 2); assert.equal(p.realizedSol, 1);
  assert.equal(position([e("sell", 1, 5, 1)]), null);
});
test("ledger: PnL of the current balance, unknown when bought elsewhere", () => {
  const list = [e("buy", 2, 1_000_000_000, 1)]; // 1000 tokens for 2 SOL
  const r = pnl(1_000_000_000n, 6, 0.003, list);
  assert.equal(r.valueSol, 3); assert.equal(r.investedSol, 2); assert.equal(r.avgSol, 0.002); assert.equal(r.pnlSol, 1); assert.equal(r.pnlPct, 50);
  const half = pnl(500_000_000n, 6, 0.001, list); // sold half elsewhere: still explained
  assert.equal(half.investedSol, 1); assert.equal(half.pnlSol, -0.5); assert.equal(half.pnlPct, -50);
  const more = pnl(2_000_000_000n, 6, 0.001, list); // more than the ledger knows
  assert.equal(more.valueSol, 2); assert.equal(more.pnlSol, null); assert.equal(more.investedSol, null);
  assert.equal(pnl(1_000_000_000n, 6, null, list).pnlSol, null);
  assert.equal(pnl(1n, 6, 1, []).pnlPct, null);
});
test("ledger: read and add (dedupe by signature, bad rows dropped)", () => {
  const l = readLedger({ W: { M: [e("buy", 1, 10, 1), { side: "buy", sol: -1, raw: "1", decimals: 6, sig: "x" }, "junk"] }, bad: 3 });
  assert.equal(l.W.M.length, 1);
  addEntry(l, "W", "M", e("buy", 1, 10, 1)); assert.equal(l.W.M.length, 1);
  addEntry(l, "W", "M", e("sell", 1, 10, 2)); assert.equal(l.W.M.length, 2);
  addEntry(l, "W2", "M", e("buy", 1, 10, 3)); assert.equal(l.W2.M.length, 1);
});
