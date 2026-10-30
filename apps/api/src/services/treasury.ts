import { db, tx } from "../db/pool.js";
import { splitEpoch } from "./split.js";
import type { Period } from "../jobs/period.js";

export interface Split {
  period: string; gross: bigint; rebate: bigint; cashback: bigint; buyback: bigint; ops: bigint; treasury: bigint; shortfall: bigint; existing?: boolean;
  /** damm_lp claims counted in this gross that have no creator_lp_rebates row yet (run lprebate first; closePeriod refuses while > 0). */
  unaccruedLpClaims?: number;
}

/** fee_claims rows counted in period p's gross: not yet split and claimed before the period end, or already tagged with p. */
const IN_GROSS = "((f.period IS NULL AND f.claimed_at < $2) OR f.period = $1)";

/** Gross = SOL fees claimed up to the period end and not yet counted in an earlier period (base-token fees are not converted).
 *  Waterfall: creator LP rebate (accrued per damm_lp claim in creator_lp_rebates) -> cashback -> 40/50/10.
 *  cashbackOverride / extraGross / extraRebate: dry-runs pass this run's (unwritten) accruals, would-be fee claims and their rebates.
 *  If rebate + cashback > gross the whole gross covers them, buyback/ops/treasury get 0 and the deficit is recorded as shortfall. */
export async function previewSplit(p: Period, cashbackOverride?: bigint, extraGross = 0n, extraRebate = 0n): Promise<Split> {
  const prev = await db.query<{ gross_lamports: string; cashback_lamports: string; buyback_lamports: string; ops_lamports: string; treasury_lamports: string; shortfall_lamports: string; creator_rebate_lamports: string }>(
    "SELECT gross_lamports::text, cashback_lamports::text, buyback_lamports::text, ops_lamports::text, treasury_lamports::text, shortfall_lamports::text, creator_rebate_lamports::text FROM treasury_splits WHERE period = $1", [p.id]);
  if (prev.rows[0]) {
    const r = prev.rows[0];
    return { period: p.id, gross: BigInt(r.gross_lamports), rebate: BigInt(r.creator_rebate_lamports), cashback: BigInt(r.cashback_lamports), buyback: BigInt(r.buyback_lamports), ops: BigInt(r.ops_lamports), treasury: BigInt(r.treasury_lamports), shortfall: BigInt(r.shortfall_lamports), existing: true };
  }
  const g = await db.query<{ s: string }>(`SELECT coalesce(sum(lamports), 0)::text AS s FROM fee_claims f WHERE ${IN_GROSS}`, [p.id, p.end]);
  const rb = await db.query<{ s: string; missing: number }>(
    `SELECT coalesce(sum(r.rebate_lamports) FILTER (WHERE r.skip_reason IS NULL), 0)::text AS s, count(*) FILTER (WHERE r.claim_sig IS NULL)::int AS missing
       FROM fee_claims f LEFT JOIN creator_lp_rebates r ON r.claim_sig = f.sig AND r.pool = f.pool
      WHERE f.source = 'damm_lp' AND ${IN_GROSS}`, [p.id, p.end]);
  const c = await db.query<{ s: string }>("SELECT coalesce(sum(amount_lamports), 0)::text AS s FROM cashback_ledger WHERE period = $1", [p.id]);
  const gross = BigInt(g.rows[0].s) + extraGross, rebate = BigInt(rb.rows[0].s) + extraRebate, cashback = cashbackOverride ?? BigInt(c.rows[0].s);
  const unaccruedLpClaims = rb.rows[0].missing;
  return { period: p.id, ...waterfall(gross, cashback, rebate), unaccruedLpClaims };
}

/** splitEpoch, or (rebate + cashback > gross) everything to rebate / cashback with the deficit as shortfall. */
export function waterfall(gross: bigint, cashback: bigint, rebate: bigint) {
  if (rebate + cashback > gross) return { gross, rebate, cashback, buyback: 0n, ops: 0n, treasury: 0n, shortfall: rebate + cashback - gross };
  return { ...splitEpoch(gross, cashback, rebate), shortfall: 0n };
}

/** Close a period: tag its fee claims (and their creator LP rebates) and store the waterfall once (idempotent).
 *  Refuses while a counted damm_lp claim has no rebate row yet, so a rebate can never miss its split. */
export async function closePeriod(p: Period): Promise<Split> {
  const s = await previewSplit(p);
  if (s.existing) return s;
  if (s.unaccruedLpClaims) throw new Error(`period ${p.id}: ${s.unaccruedLpClaims} damm_lp fee claim(s) have no creator LP rebate row yet; run lprebate first`);
  await tx(async (c) => {
    await c.query(`UPDATE creator_lp_rebates r SET period = $1 FROM fee_claims f
                    WHERE r.claim_sig = f.sig AND r.pool = f.pool AND f.source = 'damm_lp' AND r.period IS NULL AND f.period IS NULL AND f.claimed_at < $2`, [p.id, p.end]);
    await c.query("UPDATE fee_claims SET period = $1 WHERE period IS NULL AND claimed_at < $2", [p.id, p.end]);
    await c.query(`INSERT INTO treasury_splits (period, gross_lamports, cashback_lamports, buyback_lamports, ops_lamports, treasury_lamports, shortfall_lamports, creator_rebate_lamports, created_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (period) DO NOTHING`,
      [p.id, s.gross.toString(), s.cashback.toString(), s.buyback.toString(), s.ops.toString(), s.treasury.toString(), s.shortfall.toString(), s.rebate.toString(), Date.now()]);
  });
  return s;
}
