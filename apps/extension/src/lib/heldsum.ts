/** The CA popup's Holding header: the total PnL of the listed tokens that have a known cost basis (sum of PnL over the sum of
 *  SOL invested), or the total value when none has one. Pure, so it is tested without the DOM. */
export interface RowPnl { pnlSol: number | null; pnlPct: number | null }
export interface HeldLite { mint: string; valueUsd: number | null }
export type HeldTotal =
  | { kind: "pnl"; pnlSol: number; pnlPct: number | null; counted: number; of: number }
  | { kind: "value"; usd: number; of: number }
  | null;

/** SOL invested behind a PnL row (pnl / pct), null when it cannot be told. */
export function investedOf(p: RowPnl | null | undefined): number | null {
  if (!p || p.pnlSol === null || p.pnlPct === null || !Number.isFinite(p.pnlSol) || !Number.isFinite(p.pnlPct) || p.pnlPct === 0) return null;
  const inv = (p.pnlSol * 100) / p.pnlPct;
  return Number.isFinite(inv) && inv > 0 ? inv : null;
}

export function heldTotal(tokens: HeldLite[], pnlOf: (mint: string) => RowPnl | null | undefined): HeldTotal {
  if (!tokens.length) return null;
  let pnlSum = 0, invSum = 0, counted = 0, usd = 0, anyUsd = false;
  for (const t of tokens) {
    if (t.valueUsd !== null && Number.isFinite(t.valueUsd)) { usd += t.valueUsd; anyUsd = true; }
    const p = pnlOf(t.mint);
    if (!p || p.pnlSol === null || !Number.isFinite(p.pnlSol)) continue;
    const inv = investedOf(p);
    // a zero PnL has no pct to split: it still counts, with no invested share
    if (inv === null && p.pnlSol !== 0) continue;
    pnlSum += p.pnlSol; invSum += inv ?? 0; counted++;
  }
  if (counted) return { kind: "pnl", pnlSol: pnlSum, pnlPct: invSum > 0 ? (pnlSum / invSum) * 100 : null, counted, of: tokens.length };
  return anyUsd ? { kind: "value", usd, of: tokens.length } : null;
}
