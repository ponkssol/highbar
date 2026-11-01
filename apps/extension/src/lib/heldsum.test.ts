import { test } from "node:test";
import assert from "node:assert/strict";
import { heldTotal, investedOf } from "./heldsum";

test("held total: PnL over the tokens with a cost basis, pct weighted by SOL invested", () => {
  const pnl: Record<string, { pnlSol: number; pnlPct: number }> = { a: { pnlSol: -0.5, pnlPct: -25 }, b: { pnlSol: 1, pnlPct: 50 } };
  const r = heldTotal([{ mint: "a", valueUsd: 100 }, { mint: "b", valueUsd: 300 }, { mint: "c", valueUsd: 50 }], (m) => pnl[m]);
  assert.equal(r?.kind, "pnl");
  if (r?.kind !== "pnl") return;
  assert.equal(r.pnlSol, 0.5); assert.equal(r.counted, 2); assert.equal(r.of, 3);
  assert.ok(Math.abs((r.pnlPct ?? 0) - 12.5) < 1e-9); // 0.5 / (2 + 2)
});
test("held total: no cost basis anywhere falls back to the total value", () => {
  assert.deepEqual(heldTotal([{ mint: "a", valueUsd: 10 }, { mint: "b", valueUsd: null }], () => null), { kind: "value", usd: 10, of: 2 });
  assert.equal(heldTotal([], () => null), null);
  assert.equal(heldTotal([{ mint: "a", valueUsd: null }], () => null), null);
});
test("invested: pnl / pct, nothing for unknown or zero pct", () => {
  assert.equal(investedOf({ pnlSol: -0.2, pnlPct: -10 }), 2);
  assert.equal(investedOf({ pnlSol: 0.2, pnlPct: null }), null);
  assert.equal(investedOf({ pnlSol: 0, pnlPct: 0 }), null);
  assert.equal(investedOf(null), null);
});
