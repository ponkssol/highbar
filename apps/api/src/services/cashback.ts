import { PublicKey, SystemProgram, Transaction, type Keypair } from "@solana/web3.js";
import { BPS, TRADER_CASHBACK_BPS } from "@hb/shared";
import { getConnection } from "@hb/onchain";
import { db } from "../db/pool.js";
import { jobs } from "../jobs/config.js";
import { memoIx, sendOnce, sigState, simulate } from "../jobs/chain.js";
import type { Period } from "../jobs/period.js";

export interface Accrual { wallet: string; trades: number; volume: bigint; amount: bigint; /** $HIGHER holder extra included in amount (step 8) */ bonus?: bigint; barTier?: string; barRaw?: bigint }
/** Optional per-wallet extra on top of the base cashback (step 8 $HIGHER holder boost, services/bar.ts). */
export type CashbackBoost = (wallet: string, volume: bigint) => Promise<{ bonus: bigint; tier: string; raw: bigint }>;
export interface Payout { wallets: string[]; periods: string[]; lamports: bigint; sig?: string; status: "paid" | "would-pay" | "failed"; note?: string }

/** Cashback = TRADER_CASHBACK_BPS (0.05%) of a wallet's via_ui volume in the period. Wallets in `exclude` (platform, treasury, referral) earn nothing.
 *  `boost` (optional) adds a per-wallet bonus ($HIGHER holder multiplier + fee rebate); without it the result is the plain base cashback. */
export async function computeAccruals(p: Period, exclude: string[], boost?: CashbackBoost): Promise<Accrual[]> {
  const { rows } = await db.query<{ wallet: string; trades: number; vol: string }>(
    `SELECT wallet, count(*)::int AS trades, sum(round(sol * 1e9))::bigint::text AS vol
       FROM trades WHERE via_ui AND wallet IS NOT NULL AND wallet <> '' AND ts >= $1 AND ts < $2 AND NOT (wallet = ANY($3::text[]))
      GROUP BY wallet ORDER BY wallet`, [p.start, p.end, exclude]);
  const out = rows.map((r): Accrual => { const volume = BigInt(r.vol); return { wallet: r.wallet, trades: r.trades, volume, amount: (volume * BigInt(TRADER_CASHBACK_BPS)) / BigInt(BPS) }; });
  if (boost) for (const a of out) { const b = await boost(a.wallet, a.volume); Object.assign(a, { amount: a.amount + b.bonus, bonus: b.bonus, barTier: b.tier, barRaw: b.raw }); }
  return out.filter((a) => a.amount > 0n);
}

/** Write a period's accruals. Rows already paid / being paid are never touched, so re-running a period is safe. */
export async function writeAccruals(p: Period, rows: Accrual[]) {
  const now = Date.now();
  for (const a of rows) await db.query(
    `INSERT INTO cashback_ledger (wallet, period, period_start, period_end, trades, volume_lamports, amount_lamports, created_at, bonus_lamports, bar_tier, bar_balance_raw)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     ON CONFLICT (wallet, period) DO UPDATE SET trades = EXCLUDED.trades, volume_lamports = EXCLUDED.volume_lamports, amount_lamports = EXCLUDED.amount_lamports,
       bonus_lamports = EXCLUDED.bonus_lamports, bar_tier = EXCLUDED.bar_tier, bar_balance_raw = EXCLUDED.bar_balance_raw
      WHERE cashback_ledger.paid_sig IS NULL AND cashback_ledger.pending_sig IS NULL`,
    [a.wallet, p.id, p.start, p.end, a.trades, a.volume.toString(), a.amount.toString(), now, (a.bonus ?? 0n).toString(), a.barTier ?? null, a.barRaw?.toString() ?? null]);
}

/** Pending payouts from an earlier (crashed / timed-out) run: landed -> paid, failed or expired -> unpaid again. */
export async function reconcilePayouts() {
  const { rows } = await db.query<{ pending_sig: string; pending_at: number }>("SELECT DISTINCT pending_sig, pending_at FROM cashback_ledger WHERE pending_sig IS NOT NULL AND paid_sig IS NULL");
  for (const r of rows) {
    const s = await sigState(r.pending_sig);
    if (s === "landed") await db.query("UPDATE cashback_ledger SET paid_sig = pending_sig, paid_at = $2 WHERE pending_sig = $1", [r.pending_sig, Date.now()]);
    else if (s === "failed" || Date.now() - r.pending_at > 5 * 60_000) // blockhash long expired -> can no longer land
      await db.query("UPDATE cashback_ledger SET pending_sig = NULL, pending_at = NULL WHERE pending_sig = $1 AND paid_sig IS NULL", [r.pending_sig]);
  }
}

/** Pay all unpaid ledger balances >= CASHBACK_MIN_PAYOUT_SOL from `payer`, CASHBACK_BATCH wallets per tx (+ memo).
 *  Smaller balances roll over. `extra` = dry-run accruals not written to the ledger yet, so the preview includes them. */
export async function payCashback(payer: Keypair, live: boolean, extra: { period: string; rows: Accrual[] } | null = null): Promise<Payout[]> {
  if (live) await reconcilePayouts();
  const { rows } = await db.query<{ wallet: string; total: string; periods: string[] }>(
    "SELECT wallet, sum(amount_lamports)::text AS total, array_agg(period ORDER BY period) AS periods FROM cashback_ledger WHERE paid_sig IS NULL AND pending_sig IS NULL GROUP BY wallet");
  const owed = new Map(rows.map((r) => [r.wallet, { lamports: BigInt(r.total), periods: r.periods }]));
  for (const a of extra?.rows ?? []) {
    const o = owed.get(a.wallet) ?? { lamports: 0n, periods: [] };
    if (!o.periods.includes(extra!.period)) owed.set(a.wallet, { lamports: o.lamports + a.amount, periods: [...o.periods, extra!.period] });
  }
  const due = [...owed].filter(([w, o]) => o.lamports >= jobs.cashbackMinPayout && w !== payer.publicKey.toBase58() && isKey(w));
  if (!due.length) return [];

  const conn = getConnection();
  const total = due.reduce((a, [, o]) => a + o.lamports, 0n);
  const bal = BigInt(await conn.getBalance(payer.publicKey, "confirmed"));
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
    const tx = new Transaction();
    for (const [w, o] of batch) tx.add(SystemProgram.transfer({ fromPubkey: payer.publicKey, toPubkey: new PublicKey(w), lamports: o.lamports }));
    tx.add(memoIx(`highbar cashback ${periods[0]}${periods.length > 1 ? `..${periods.at(-1)}` : ""}`));
    const base = { wallets: batch.map(([w]) => w), periods, lamports };
    if (!live) { const sim = await simulate(tx, payer.publicKey); out.push({ ...base, status: sim.ok ? "would-pay" : "failed", note: sim.err }); continue; }
    try {
      const sig = await sendOnce(tx, [payer], async (s) => {
        for (const [w, o] of batch) await db.query("UPDATE cashback_ledger SET pending_sig = $1, pending_at = $2 WHERE wallet = $3 AND period = ANY($4::text[]) AND paid_sig IS NULL AND pending_sig IS NULL", [s, Date.now(), w, o.periods]);
      });
      await db.query("UPDATE cashback_ledger SET paid_sig = pending_sig, paid_at = $2 WHERE pending_sig = $1", [sig, Date.now()]);
      out.push({ ...base, sig, status: "paid" });
    } catch (e) { out.push({ ...base, status: "failed", note: (e as Error).message }); } // stays pending; reconcilePayouts settles it next run
  }
  return out;
}

const isKey = (w: string) => { try { return PublicKey.isOnCurve(new PublicKey(w).toBytes()); } catch { return false; } };
