import { db, tx } from "../db/pool.js";
import { splitEpoch } from "./split.js";
import type { Period } from "../jobs/period.js";

export interface Split { period: string; gross: bigint; cashback: bigint; buyback: bigint; ops: bigint; treasury: bigint; shortfall: bigint; existing?: boolean }

/** Gross = SOL fees claimed up to the period end and not yet counted in an earlier period (base-token fees are not converted).
 *  cashbackOverride / extraGross: dry-runs pass this run's (unwritten) accruals and would-be fee claims.
 *  If cashback > gross the whole gross covers cashback, buyback/ops/treasury get 0 and the deficit is recorded as shortfall. */
export async function previewSplit(p: Period, cashbackOverride?: bigint, extraGross = 0n): Promise<Split> {
  const prev = await db.query<{ gross_lamports: string; cashback_lamports: string; buyback_lamports: string; ops_lamports: string; treasury_lamports: string; shortfall_lamports: string }>(
    "SELECT gross_lamports::text, cashback_lamports::text, buyback_lamports::text, ops_lamports::text, treasury_lamports::text, shortfall_lamports::text FROM treasury_splits WHERE period = $1", [p.id]);
  if (prev.rows[0]) {
    const r = prev.rows[0];
    return { period: p.id, gross: BigInt(r.gross_lamports), cashback: BigInt(r.cashback_lamports), buyback: BigInt(r.buyback_lamports), ops: BigInt(r.ops_lamports), treasury: BigInt(r.treasury_lamports), shortfall: BigInt(r.shortfall_lamports), existing: true };
  }
  const g = await db.query<{ s: string }>("SELECT coalesce(sum(lamports), 0)::text AS s FROM fee_claims WHERE (period IS NULL AND claimed_at < $2) OR period = $1", [p.id, p.end]);
  const c = await db.query<{ s: string }>("SELECT coalesce(sum(amount_lamports), 0)::text AS s FROM cashback_ledger WHERE period = $1", [p.id]);
  const gross = BigInt(g.rows[0].s) + extraGross, cashback = cashbackOverride ?? BigInt(c.rows[0].s);
  if (cashback > gross) return { period: p.id, gross, cashback, buyback: 0n, ops: 0n, treasury: 0n, shortfall: cashback - gross };
  return { period: p.id, ...splitEpoch(gross, cashback), shortfall: 0n };
}

/** Close a period: tag its fee claims and store the waterfall once (idempotent). */
export async function closePeriod(p: Period): Promise<Split> {
  const s = await previewSplit(p);
  if (s.existing) return s;
  await tx(async (c) => {
    await c.query("UPDATE fee_claims SET period = $1 WHERE period IS NULL AND claimed_at < $2", [p.id, p.end]);
    await c.query(`INSERT INTO treasury_splits (period, gross_lamports, cashback_lamports, buyback_lamports, ops_lamports, treasury_lamports, shortfall_lamports, created_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (period) DO NOTHING`,
      [p.id, s.gross.toString(), s.cashback.toString(), s.buyback.toString(), s.ops.toString(), s.treasury.toString(), s.shortfall.toString(), Date.now()]);
  });
  return s;
}
