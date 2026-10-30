import type { Keypair } from "@solana/web3.js";
import { platformFeeLamports, referralRewardLamports, type TierId } from "@hb/shared";
import { db } from "../db/pool.js";
import { rewards2 } from "../jobs/rewardsConfig.js";
import type { Period } from "../jobs/period.js";
import { isKey, payBatches, reconcile, type PayoutResult } from "./payouts.js";

export const ADDR = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
export interface RefAccrual { referrer: string; referees: number; trades: number; volume: bigint; platformFee: bigint; amount: bigint }
export type BindResult = { ok: true; referrer: string; createdAt: number; created: boolean } | { ok: false; code: 400 | 409; error: string; referrer?: string };

/** Associate `referee` (signed-in wallet) with `referrer` once. First link wins and is immutable; no self or two-way referrals. */
export async function bindReferral(referee: string, referrer: string, source = "link", exclude: string[] = []): Promise<BindResult> {
  if (!ADDR.test(referrer) || !isKey(referrer)) return { ok: false, code: 400, error: "invalid referrer address" };
  if (referrer === referee) return { ok: false, code: 400, error: "you cannot refer yourself" };
  if (exclude.includes(referrer)) return { ok: false, code: 400, error: "this wallet cannot be a referrer" };
  const back = await db.query("SELECT 1 FROM referrals WHERE referee = $1 AND referrer = $2", [referrer, referee]);
  if (back.rowCount) return { ok: false, code: 400, error: "that wallet was referred by you" };
  const now = Date.now();
  const ins = await db.query<{ referrer: string; created_at: number }>(
    "INSERT INTO referrals (referee, referrer, source, created_at) VALUES ($1,$2,$3,$4) ON CONFLICT (referee) DO NOTHING RETURNING referrer, created_at", [referee, referrer, source.slice(0, 32), now]);
  if (ins.rows[0]) return { ok: true, referrer, createdAt: now, created: true };
  const cur = (await db.query<{ referrer: string; created_at: number }>("SELECT referrer, created_at FROM referrals WHERE referee = $1", [referee])).rows[0];
  if (cur?.referrer === referrer) return { ok: true, referrer, createdAt: Number(cur.created_at), created: false };
  return { ok: false, code: 409, error: "this wallet already has a referrer", referrer: cur?.referrer };
}

/** Per referrer: sum over referees' via_ui trades in the period (only trades after the referral was made) of
 *  rewardBps x platform fee share (per tier). Referrers in `exclude` (platform, treasury, referral wallet) earn nothing. */
export async function computeReferralAccruals(p: Period, exclude: string[], rewardBps = rewards2.referralRewardBps): Promise<RefAccrual[]> {
  const { rows } = await db.query<{ referrer: string; tier: TierId | null; referees: string[]; trades: number; vol: string; fee: string }>(
    `SELECT r.referrer, k.tier, array_agg(DISTINCT t.wallet) AS referees, count(*)::int AS trades,
            sum(round(t.sol * 1e9))::bigint::text AS vol, sum(round(t.fee_sol * 1e9))::bigint::text AS fee
       FROM trades t JOIN referrals r ON r.referee = t.wallet LEFT JOIN tokens k ON k.mint = t.mint
      WHERE t.via_ui AND t.ts >= $1 AND t.ts < $2 AND t.ts >= r.created_at AND NOT (r.referrer = ANY($3::text[]))
      GROUP BY r.referrer, k.tier ORDER BY r.referrer`, [p.start, p.end, exclude]);
  const by = new Map<string, RefAccrual & { set: Set<string> }>();
  for (const r of rows) {
    const a = by.get(r.referrer) ?? { referrer: r.referrer, referees: 0, trades: 0, volume: 0n, platformFee: 0n, amount: 0n, set: new Set<string>() };
    const vol = BigInt(r.vol), pf = platformFeeLamports(r.tier ?? "standard", BigInt(r.fee), vol);
    a.trades += r.trades; a.volume += vol; a.platformFee += pf; r.referees.forEach((w) => a.set.add(w));
    by.set(r.referrer, a);
  }
  return [...by.values()].map(({ set, ...a }) => ({ ...a, referees: set.size, amount: referralRewardLamports(a.platformFee, rewardBps) })).filter((a) => a.amount > 0n);
}

/** Scale accruals down pro-rata so their total stays within `cap` lamports (null = uncapped). */
export function capAccruals(rows: RefAccrual[], cap: bigint | null): { rows: RefAccrual[]; capped: boolean } {
  const total = rows.reduce((s, r) => s + r.amount, 0n);
  if (cap === null || total <= cap) return { rows, capped: false };
  return { rows: rows.map((r) => ({ ...r, amount: total ? (r.amount * cap) / total : 0n })).filter((r) => r.amount > 0n), capped: true };
}

/** Write a period's rewards. Rows already paid / being paid are never touched, so re-running a period is safe. */
export async function writeReferralAccruals(p: Period, rows: RefAccrual[]) {
  const now = Date.now();
  for (const a of rows) await db.query(
    `INSERT INTO referral_rewards (referrer, period, period_start, period_end, referees, trades, volume_lamports, platform_fee_lamports, amount_lamports, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     ON CONFLICT (referrer, period) DO UPDATE SET referees = EXCLUDED.referees, trades = EXCLUDED.trades, volume_lamports = EXCLUDED.volume_lamports,
       platform_fee_lamports = EXCLUDED.platform_fee_lamports, amount_lamports = EXCLUDED.amount_lamports
      WHERE referral_rewards.paid_sig IS NULL AND referral_rewards.pending_sig IS NULL`,
    [a.referrer, p.id, p.start, p.end, a.referees, a.trades, a.volume.toString(), a.platformFee.toString(), a.amount.toString(), now]);
}

/** Pay unpaid referrer balances >= REFERRAL_MIN_PAYOUT_SOL (smaller ones roll over). `extra` = dry-run accruals not written yet. */
export async function payReferrals(payer: Keypair, live: boolean, extra: { period: string; rows: RefAccrual[] } | null = null): Promise<PayoutResult[]> {
  if (live) await reconcile("referral_rewards");
  const { rows } = await db.query<{ referrer: string; total: string; periods: string[] }>(
    "SELECT referrer, sum(amount_lamports)::text AS total, array_agg(period ORDER BY period) AS periods FROM referral_rewards WHERE paid_sig IS NULL AND pending_sig IS NULL GROUP BY referrer");
  const owed = new Map(rows.map((r) => [r.referrer, { lamports: BigInt(r.total), periods: r.periods }]));
  for (const a of extra?.rows ?? []) {
    const o = owed.get(a.referrer) ?? { lamports: 0n, periods: [] };
    if (!o.periods.includes(extra!.period)) owed.set(a.referrer, { lamports: o.lamports + a.amount, periods: [...o.periods, extra!.period] });
  }
  const due = [...owed].filter(([, o]) => o.lamports >= rewards2.referralMinPayout).map(([wallet, o]) => ({ wallet, lamports: o.lamports, ref: o.periods }));
  return payBatches({
    payer, live, due, batch: rewards2.payoutBatch,
    memo: (b) => { const ps = [...new Set(b.flatMap((d) => d.ref))].sort(); return `highbar referral ${ps[0]}${ps.length > 1 ? `..${ps.at(-1)}` : ""}`; },
    markPending: async (sig, b) => { for (const d of b) await db.query("UPDATE referral_rewards SET pending_sig = $1, pending_at = $2 WHERE referrer = $3 AND period = ANY($4::text[]) AND paid_sig IS NULL AND pending_sig IS NULL", [sig, Date.now(), d.wallet, d.ref]); },
    markPaid: async (sig) => { await db.query("UPDATE referral_rewards SET paid_sig = pending_sig, paid_at = $2 WHERE pending_sig = $1", [sig, Date.now()]); },
  });
}

/** Read side for GET /referrals/:wallet. */
export const referralStore = {
  async referrerOf(wallet: string) {
    const r = (await db.query<{ referrer: string; created_at: number }>("SELECT referrer, created_at FROM referrals WHERE referee = $1", [wallet])).rows[0];
    return r ? { referrer: r.referrer, createdAt: Number(r.created_at) } : null;
  },
  /** Referees with their platform volume since they were referred. */
  async referees(wallet: string, limit = 50) {
    const { rows } = await db.query<{ referee: string; created_at: number; trades: number; vol: string }>(
      `SELECT r.referee, r.created_at, count(t.sig)::int AS trades, coalesce(sum(round(t.sol * 1e9)), 0)::bigint::text AS vol
         FROM referrals r LEFT JOIN trades t ON t.wallet = r.referee AND t.via_ui AND t.ts >= r.created_at
        WHERE r.referrer = $1 GROUP BY r.referee, r.created_at ORDER BY r.created_at DESC LIMIT $2`, [wallet, limit]);
    const n = (await db.query<{ n: number }>("SELECT count(*)::int AS n FROM referrals WHERE referrer = $1", [wallet])).rows[0].n;
    return { total: n, items: rows.map((r) => ({ wallet: r.referee, joinedAt: Number(r.created_at), trades: r.trades, volumeSol: Number(r.vol) / 1e9 })) };
  },
  async ledger(wallet: string, limit = 60) {
    const { rows } = await db.query(
      `SELECT period, referees, trades, volume_lamports::text AS v, platform_fee_lamports::text AS f, amount_lamports::text AS a, paid_sig, paid_at, pending_sig IS NOT NULL AS pending
         FROM referral_rewards WHERE referrer = $1 ORDER BY period DESC LIMIT $2`, [wallet, limit]);
    return rows.map((r) => ({ period: r.period as string, referees: r.referees as number, trades: r.trades as number, volumeSol: Number(r.v) / 1e9, platformFeeSol: Number(r.f) / 1e9,
      amountSol: Number(r.a) / 1e9, paidSig: r.paid_sig as string | null, paidAt: r.paid_at as number | null, pending: r.pending as boolean }));
  },
  async totals(wallet: string) {
    const r = (await db.query(
      `SELECT coalesce(sum(amount_lamports) FILTER (WHERE paid_sig IS NOT NULL), 0)::text AS paid, coalesce(sum(amount_lamports) FILTER (WHERE paid_sig IS NULL), 0)::text AS unpaid,
              coalesce(max(period_end), 0) AS through FROM referral_rewards`, [])).rows[0];
    const mine = (await db.query(
      `SELECT coalesce(sum(amount_lamports) FILTER (WHERE paid_sig IS NOT NULL), 0)::text AS paid, coalesce(sum(amount_lamports) FILTER (WHERE paid_sig IS NULL), 0)::text AS unpaid
         FROM referral_rewards WHERE referrer = $1`, [wallet])).rows[0];
    return { paidSol: Number(mine.paid) / 1e9, unpaidSol: Number(mine.unpaid) / 1e9, closedThrough: Number(r.through) };
  },
  /** Estimated reward on referees' trades after the last period the job wrote (per tier, same math as the job). */
  async openEstimate(wallet: string, fromTs: number, rewardBps = rewards2.referralRewardBps) {
    const { rows } = await db.query<{ tier: TierId | null; vol: string; fee: string }>(
      `SELECT k.tier, coalesce(sum(round(t.sol * 1e9)), 0)::bigint::text AS vol, coalesce(sum(round(t.fee_sol * 1e9)), 0)::bigint::text AS fee
         FROM trades t JOIN referrals r ON r.referee = t.wallet LEFT JOIN tokens k ON k.mint = t.mint
        WHERE r.referrer = $1 AND t.via_ui AND t.ts >= r.created_at AND t.ts >= $2 GROUP BY k.tier`, [wallet, fromTs]);
    const pf = rows.reduce((s, r) => s + platformFeeLamports(r.tier ?? "standard", BigInt(r.fee), BigInt(r.vol)), 0n);
    return Number(referralRewardLamports(pf, rewardBps)) / 1e9;
  },
};
