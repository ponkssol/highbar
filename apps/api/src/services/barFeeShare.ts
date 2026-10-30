/** $BAR holder fee share (step 8): BAR_FEE_SHARE_BPS of a closed period's ops allocation, pro-rata by $BAR balance.
 *  Accrual ledger + payout job with the cashback safety model (simulate first, sign once, pending_sig reconcile).
 *  Payouts additionally need BAR_FEE_SHARE_LIVE=true (legal review of fee-linked token payouts, BUILD_BRIEF section 6). */
import { PublicKey, SystemProgram, Transaction, type Keypair } from "@solana/web3.js";
import { getConnection } from "@hb/onchain";
import { db, tx } from "../db/pool.js";
import { bar } from "../jobs/barConfig.js";
import { jobs } from "../jobs/config.js";
import { memoIx, sendOnce, sigState, simulate } from "../jobs/chain.js";
import type { Period } from "../jobs/period.js";
import { previewSplit } from "./treasury.js";
import { barHolders, barMint, periodBalances } from "./bar.js";
import { allocateFeeShare, feeShareMinRaw, feeSharePool, type ShareRow } from "./barMath.js";
import type { Payout } from "./cashback.js";

export interface SharePlan {
  period: string; barMint: string; opsLamports: bigint; shareBps: number; poolLamports: bigint; allocatedLamports: bigint;
  holders: number; totalRaw: bigint; source: "snapshots" | "current"; snapshots: number; rows: ShareRow[]; existing?: boolean;
}

const isKey = (w: string) => { try { return PublicKey.isOnCurve(new PublicKey(w).toBytes()); } catch { return false; } };

/** Plan a period's fee share. Live: the period's treasury split must already be closed (jobs:epoch / jobs:buyback --live), and an
 *  existing plan is returned unchanged. Dry-run: previews the split. Holder balances = min over the period's snapshots,
 *  else the current holder set (refused live when BAR_REQUIRE_SNAPSHOTS). Off-curve owners (PDAs: pool / LP vaults) and `exclude` get nothing. */
export async function planFeeShare(p: Period, exclude: string[], live: boolean): Promise<SharePlan> {
  const m = await barMint();
  const prev = (await db.query("SELECT * FROM bar_fee_share_periods WHERE period = $1", [p.id])).rows[0];
  if (prev) {
    const { rows } = await db.query<{ wallet: string; balance_raw: string; amount_lamports: string }>("SELECT wallet, balance_raw::text, amount_lamports::text FROM bar_fee_share_ledger WHERE period = $1 ORDER BY wallet", [p.id]);
    return { period: p.id, barMint: prev.bar_mint, opsLamports: BigInt(prev.ops_lamports), shareBps: prev.share_bps, poolLamports: BigInt(prev.pool_lamports), allocatedLamports: BigInt(prev.allocated_lamports),
      holders: prev.holders, totalRaw: BigInt(prev.total_balance_raw), source: prev.source, snapshots: prev.snapshots, existing: true,
      rows: rows.map((r) => ({ wallet: r.wallet, raw: BigInt(r.balance_raw), amount: BigInt(r.amount_lamports) })) };
  }
  const split = await previewSplit(p);
  if (live && !split.existing) throw new Error(`treasury split for ${p.id} is not closed yet; run jobs:epoch (or jobs:buyback) --live for that period first`);
  const snap = await periodBalances(p);
  if (!snap.snapshots && live && bar.requireSnapshots) throw new Error(`no $BAR snapshots in ${p.id} (BAR_REQUIRE_SNAPSHOTS); run jobs:barsnap --live during the period`);
  const holders = snap.snapshots ? snap.balances : await barHolders();
  const skip = new Set(exclude);
  const pool = feeSharePool(split.ops, bar.feeShareBps);
  const a = allocateFeeShare(pool, [...holders].filter(([w]) => !skip.has(w) && isKey(w)), feeShareMinRaw(m.decimals));
  return { period: p.id, barMint: m.mint.toBase58(), opsLamports: split.ops, shareBps: bar.feeShareBps, poolLamports: pool, allocatedLamports: a.allocated,
    holders: a.rows.length, totalRaw: a.totalRaw, source: snap.snapshots ? "snapshots" : "current", snapshots: snap.snapshots, rows: a.rows };
}

/** Persist a plan once per period (period row + ledger rows in one transaction; re-runs are no-ops). */
export async function writeFeeShare(plan: SharePlan) {
  if (plan.existing) return;
  await tx(async (c) => {
    const ins = await c.query(`INSERT INTO bar_fee_share_periods (period, bar_mint, ops_lamports, share_bps, pool_lamports, allocated_lamports, holders, total_balance_raw, source, snapshots, created_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT (period) DO NOTHING`,
      [plan.period, plan.barMint, plan.opsLamports.toString(), plan.shareBps, plan.poolLamports.toString(), plan.allocatedLamports.toString(), plan.holders, plan.totalRaw.toString(), plan.source, plan.snapshots, Date.now()]);
    if (!ins.rowCount) return;
    const rows = plan.rows.filter((r) => r.amount > 0n);
    for (let i = 0; i < rows.length; i += 1000) {
      const b = rows.slice(i, i + 1000);
      await c.query(`INSERT INTO bar_fee_share_ledger (wallet, period, balance_raw, amount_lamports, created_at)
        SELECT w, $1, r::numeric, a::bigint, $5 FROM unnest($2::text[], $3::text[], $4::text[]) AS x(w, r, a)`,
        [plan.period, b.map((r) => r.wallet), b.map((r) => r.raw.toString()), b.map((r) => r.amount.toString()), Date.now()]);
    }
  });
}

/** Pending fee share payouts from an earlier run: landed -> paid, failed / expired -> unpaid again. */
async function reconcile() {
  const { rows } = await db.query<{ pending_sig: string; pending_at: number }>("SELECT DISTINCT pending_sig, pending_at FROM bar_fee_share_ledger WHERE pending_sig IS NOT NULL AND paid_sig IS NULL");
  for (const r of rows) {
    const s = await sigState(r.pending_sig);
    if (s === "landed") await db.query("UPDATE bar_fee_share_ledger SET paid_sig = pending_sig, paid_at = $2 WHERE pending_sig = $1", [r.pending_sig, Date.now()]);
    else if (s === "failed" || Date.now() - r.pending_at > 5 * 60_000)
      await db.query("UPDATE bar_fee_share_ledger SET pending_sig = NULL, pending_at = NULL WHERE pending_sig = $1 AND paid_sig IS NULL", [r.pending_sig]);
  }
}

/** Pay unpaid fee share balances >= CASHBACK_MIN_PAYOUT_SOL from `payer`, CASHBACK_BATCH wallets per tx + memo. Every tx is simulated first;
 *  live sends sign once and store pending_sig before sending. `extra` = a dry-run plan not written yet, so the preview includes it. */
export async function payFeeShare(payer: Keypair, live: boolean, extra: SharePlan | null = null): Promise<Payout[]> {
  if (live && !bar.feeShareLive) return [{ wallets: [], periods: [], lamports: 0n, status: "failed", note: "payouts disabled: set BAR_FEE_SHARE_LIVE=true after legal review (accruals are still written)" }];
  if (live) await reconcile();
  const { rows } = await db.query<{ wallet: string; total: string; periods: string[] }>(
    "SELECT wallet, sum(amount_lamports)::text AS total, array_agg(period ORDER BY period) AS periods FROM bar_fee_share_ledger WHERE paid_sig IS NULL AND pending_sig IS NULL GROUP BY wallet");
  const owed = new Map(rows.map((r) => [r.wallet, { lamports: BigInt(r.total), periods: r.periods }]));
  if (extra && !extra.existing) for (const r of extra.rows) {
    const o = owed.get(r.wallet) ?? { lamports: 0n, periods: [] };
    if (r.amount > 0n && !o.periods.includes(extra.period)) owed.set(r.wallet, { lamports: o.lamports + r.amount, periods: [...o.periods, extra.period] });
  }
  const due = [...owed].filter(([w, o]) => o.lamports >= jobs.cashbackMinPayout && w !== payer.publicKey.toBase58() && isKey(w));
  if (!due.length) return [];
  const total = due.reduce((a, [, o]) => a + o.lamports, 0n);
  const bal = BigInt(await getConnection().getBalance(payer.publicKey, "confirmed"));
  const out: Payout[] = [];
  if (bal < total + 10_000_000n) {
    const note = `payer ${payer.publicKey.toBase58()} has ${bal} lamports, needs ${total} + 0.01 SOL buffer`;
    if (live) throw new Error(note);
    out.push({ wallets: [], periods: [], lamports: 0n, status: "failed", note });
  }
  for (let i = 0; i < due.length; i += jobs.cashbackBatch) {
    const batch = due.slice(i, i + jobs.cashbackBatch);
    const periods = [...new Set(batch.flatMap(([, o]) => o.periods))].sort();
    const lamports = batch.reduce((a, [, o]) => a + o.lamports, 0n);
    const t = new Transaction();
    for (const [w, o] of batch) t.add(SystemProgram.transfer({ fromPubkey: payer.publicKey, toPubkey: new PublicKey(w), lamports: o.lamports }));
    t.add(memoIx(`highbar BAR fee share ${periods[0]}${periods.length > 1 ? `..${periods.at(-1)}` : ""}`));
    const base = { wallets: batch.map(([w]) => w), periods, lamports };
    const sim = await simulate(t, payer.publicKey);
    if (!live || !sim.ok) { out.push({ ...base, status: sim.ok ? "would-pay" : "failed", note: sim.err }); if (live) break; continue; }
    try {
      const sig = await sendOnce(t, [payer], async (s) => {
        for (const [w, o] of batch) await db.query("UPDATE bar_fee_share_ledger SET pending_sig = $1, pending_at = $2 WHERE wallet = $3 AND period = ANY($4::text[]) AND paid_sig IS NULL AND pending_sig IS NULL", [s, Date.now(), w, o.periods]);
      });
      await db.query("UPDATE bar_fee_share_ledger SET paid_sig = pending_sig, paid_at = $2 WHERE pending_sig = $1", [sig, Date.now()]);
      out.push({ ...base, sig, status: "paid" });
    } catch (e) { out.push({ ...base, status: "failed", note: (e as Error).message }); }
  }
  return out;
}

/** Read side for GET /bar/:wallet. */
export async function feeShareFor(wallet: string, limit = 60) {
  const { rows } = await db.query(
    `SELECT l.period, l.balance_raw::text AS raw, l.amount_lamports::text AS a, l.paid_sig, l.paid_at, l.pending_sig IS NOT NULL AS pending, p.pool_lamports::text AS pool
       FROM bar_fee_share_ledger l JOIN bar_fee_share_periods p USING (period) WHERE l.wallet = $1 ORDER BY l.period DESC LIMIT $2`, [wallet, limit]);
  const t = (await db.query(
    `SELECT coalesce(sum(amount_lamports) FILTER (WHERE paid_sig IS NOT NULL), 0)::text AS paid, coalesce(sum(amount_lamports) FILTER (WHERE paid_sig IS NULL), 0)::text AS unpaid
       FROM bar_fee_share_ledger WHERE wallet = $1`, [wallet])).rows[0];
  const cb = (await db.query("SELECT coalesce(sum(bonus_lamports), 0)::text AS b, coalesce(sum(bonus_lamports) FILTER (WHERE paid_sig IS NOT NULL), 0)::text AS p FROM cashback_ledger WHERE wallet = $1", [wallet])).rows[0];
  const sol = (v: string) => Number(v) / 1e9;
  return {
    paidSol: sol(t.paid), unpaidSol: sol(t.unpaid), cashbackBonusSol: sol(cb.b), cashbackBonusPaidSol: sol(cb.p),
    ledger: rows.map((r) => ({ period: r.period as string, balanceRaw: r.raw as string, amountSol: sol(r.a), poolSol: sol(r.pool), paidSig: r.paid_sig as string | null, paidAt: r.paid_at as number | null, pending: !!r.pending })),
  };
}
