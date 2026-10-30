import fs from "node:fs";
import path from "node:path";
import { Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { NATIVE_MINT, createAssociatedTokenAccountIdempotentInstruction, createCloseAccountInstruction, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { REFERRAL_FEE_BPS_OF_TRADE_FEE, planReferralPool, type ReferralPlan } from "@hb/shared";
import { getConnection, referralAta, referralWallet } from "@hb/onchain";
import { db, tx, type Q } from "../db/pool.js";
import { rewards2 } from "../jobs/rewardsConfig.js";
import { jobs } from "../jobs/config.js";
import { sendOnce, simulate } from "../jobs/chain.js";
import type { Period } from "../jobs/period.js";
import { isKey, payBatches, reconcile, type Due, type PayoutResult, type Payer } from "./payouts.js";

/** User referral program (BUILD_BRIEF section 5 "Referral"). Referrers are funded ONLY from the platform's swap-referral income:
 *  the referral fee the Meteora DBC program pays into REFERRAL_WALLET's WSOL account on highbar swaps (20% of Meteora's protocol fee).
 *  Nothing comes from the platform fee share, and payouts are signed by the referral wallet itself, never by the platform key.
 *
 *  Income measurement: per swap, from the indexed swap event (trades.referral_fee_lamports, the exact amount the program moved into the
 *  referral account in that swap); trades indexed before the column existed fall back to 400 bps of their fee. Only via_ui trades count
 *  (= the swap's referral account was ours). The WSOL balance itself is not used as the income figure (unwraps / closes move it), but the
 *  payout can never exceed what is spendable in the referral wallet (payBatches balance check) nor total recorded income (incomeHeadroom). */

export const ADDR = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
export interface RefAccrual { referrer: string; referees: number; trades: number; volume: bigint; referralFee: bigint; amount: bigint }
export type BindResult = { ok: true; referrer: string; createdAt: number; created: boolean } | { ok: false; code: 400 | 409; error: string; referrer?: string };
export interface ReferralPeriodPlan extends Omit<ReferralPlan, "rows"> { period: string; trades: number; derivedTrades: number; rewardBps: number; rows: RefAccrual[] }

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

/** SQL for a via_ui trade's referral fee in lamports ($n = REFERRAL_FEE_BPS_OF_TRADE_FEE). */
const REF_FEE = (n: number) => `coalesce(t.referral_fee_lamports, floor(round(t.fee_sol * 1e9) * $${n} / 10000))`;

/** Referral income received in the period: the referral fee of every highbar (via_ui) swap. */
export async function referralIncome(p: Period, q: Q = db) {
  const r = (await q.query<{ income: string; n: number; derived: number }>(
    `SELECT coalesce(sum(${REF_FEE(3)}), 0)::bigint::text AS income, count(*)::int AS n, count(*) FILTER (WHERE t.referral_fee_lamports IS NULL)::int AS derived
       FROM trades t WHERE t.via_ui AND t.ts >= $1 AND t.ts < $2`, [p.start, p.end, REFERRAL_FEE_BPS_OF_TRADE_FEE])).rows[0];
  return { income: BigInt(r.income), trades: r.n, derivedTrades: r.derived };
}

/** Per referrer: referees' via_ui curve volume and the referral fee those trades generated (only trades after the referral was made). */
export async function referralSources(p: Period, exclude: string[], q: Q = db) {
  const { rows } = await q.query<{ referrer: string; referees: number; trades: number; vol: string; ref: string }>(
    `SELECT r.referrer, count(DISTINCT t.wallet)::int AS referees, count(*)::int AS trades,
            sum(round(t.sol * 1e9))::bigint::text AS vol, sum(${REF_FEE(4)})::bigint::text AS ref
       FROM trades t JOIN referrals r ON r.referee = t.wallet
      WHERE t.via_ui AND t.ts >= $1 AND t.ts < $2 AND t.ts >= r.created_at AND NOT (r.referrer = ANY($3::text[]))
      GROUP BY r.referrer ORDER BY r.referrer`, [p.start, p.end, exclude, REFERRAL_FEE_BPS_OF_TRADE_FEE]);
  return rows.map((r) => ({ referrer: r.referrer, referees: r.referees, trades: r.trades, volume: BigInt(r.vol), referralFee: BigInt(r.ref) }));
}

/** Carry (rounding dust) from the latest earlier period in the ledger. */
async function carryBefore(period: string, q: Q = db) {
  const r = (await q.query<{ c: string }>("SELECT carry_out_lamports::text AS c FROM referral_income WHERE period < $1 ORDER BY period DESC LIMIT 1", [period])).rows[0];
  return r ? BigInt(r.c) : 0n;
}

/** Plan one closed period: income received, carry-in, pro-rata allocation by referees' volume (planReferralPool). Read-only. */
export async function planReferralPeriod(p: Period, exclude: string[], rewardBps = rewards2.referralRewardBps): Promise<ReferralPeriodPlan> {
  const [inc, src, carryIn] = await Promise.all([referralIncome(p), referralSources(p, exclude), carryBefore(p.id)]);
  const plan = planReferralPool({ income: inc.income, carryIn, sources: src, rewardBps });
  const meta = new Map(src.map((s) => [s.referrer, s]));
  const { rows, ...rest } = plan;
  return { ...rest, period: p.id, trades: inc.trades, derivedTrades: inc.derivedTrades, rewardBps,
    rows: rows.map((r) => ({ referrer: r.referrer, referees: meta.get(r.referrer)!.referees, trades: meta.get(r.referrer)!.trades, volume: r.volume, referralFee: r.referralFee, amount: r.amount })) };
}

/** Write a period's ledger + rewards in one transaction. A period is locked (left untouched, returns "locked") once a later period is in
 *  the ledger or any of its rewards is pending / paid, so re-running is safe and the carry chain never changes under a later period. */
export async function writeReferralPeriod(p: Period, plan: ReferralPeriodPlan): Promise<"written" | "locked"> {
  return tx(async (c) => {
    await c.query("SELECT pg_advisory_xact_lock(727009)");
    const later = (await c.query("SELECT 1 FROM referral_income WHERE period > $1 LIMIT 1", [p.id])).rowCount;
    const sent = (await c.query("SELECT 1 FROM referral_rewards WHERE period = $1 AND (paid_sig IS NOT NULL OR pending_sig IS NOT NULL) LIMIT 1", [p.id])).rowCount;
    const exists = (await c.query("SELECT 1 FROM referral_income WHERE period = $1", [p.id])).rowCount;
    if (exists && (later || sent)) return "locked";
    if (!exists && sent) throw new Error(`period ${p.id} has paid referral rewards from the old platform-funded program; not rewriting it`);
    const now = Date.now();
    await c.query(
      `INSERT INTO referral_income (period, period_start, period_end, income_lamports, trades, derived_trades, attributable_lamports, reward_bps, carry_in_lamports,
         budget_lamports, allocated_lamports, carry_out_lamports, unallocated_lamports, referrers, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$15)
       ON CONFLICT (period) DO UPDATE SET income_lamports = EXCLUDED.income_lamports, trades = EXCLUDED.trades, derived_trades = EXCLUDED.derived_trades,
         attributable_lamports = EXCLUDED.attributable_lamports, reward_bps = EXCLUDED.reward_bps, carry_in_lamports = EXCLUDED.carry_in_lamports,
         budget_lamports = EXCLUDED.budget_lamports, allocated_lamports = EXCLUDED.allocated_lamports, carry_out_lamports = EXCLUDED.carry_out_lamports,
         unallocated_lamports = EXCLUDED.unallocated_lamports, referrers = EXCLUDED.referrers, updated_at = EXCLUDED.updated_at`,
      [p.id, p.start, p.end, plan.income.toString(), plan.trades, plan.derivedTrades, plan.attributable.toString(), plan.rewardBps, plan.carryIn.toString(),
        plan.budget.toString(), plan.allocated.toString(), plan.carryOut.toString(), plan.unallocated.toString(), plan.rows.length, now]);
    await c.query("DELETE FROM referral_rewards WHERE period = $1 AND paid_sig IS NULL AND pending_sig IS NULL", [p.id]);
    for (const a of plan.rows) await c.query(
      `INSERT INTO referral_rewards (referrer, period, period_start, period_end, referees, trades, volume_lamports, platform_fee_lamports, referral_fee_lamports, amount_lamports, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,0,$8,$9,$10)`,
      [a.referrer, p.id, p.start, p.end, a.referees, a.trades, a.volume.toString(), a.referralFee.toString(), a.amount.toString(), now]);
    return "written";
  });
}

/** Keep `due` within `headroom` lamports (total recorded income minus everything already paid / pending): smallest balances first. */
export function withinIncome(due: Due[], headroom: bigint): { due: Due[]; held: Due[] } {
  const out: Due[] = [], held: Due[] = [];
  let left = headroom;
  for (const d of [...due].sort((a, b) => (a.lamports < b.lamports ? -1 : a.lamports > b.lamports ? 1 : a.wallet.localeCompare(b.wallet)))) {
    if (d.lamports <= left) { out.push(d); left -= d.lamports; } else held.push(d);
  }
  return { due: out, held };
}

/** Unpaid balances per referrer (ledger periods only: legacy platform-funded rows from before 0009 are never paid by this job). */
async function owed(extra: { plan: ReferralPeriodPlan } | null) {
  const { rows } = await db.query<{ referrer: string; total: string; periods: string[] }>(
    `SELECT w.referrer, sum(w.amount_lamports)::text AS total, array_agg(w.period ORDER BY w.period) AS periods
       FROM referral_rewards w JOIN referral_income i ON i.period = w.period
      WHERE w.paid_sig IS NULL AND w.pending_sig IS NULL GROUP BY w.referrer`);
  const m = new Map(rows.map((r) => [r.referrer, { lamports: BigInt(r.total), periods: r.periods }]));
  for (const a of extra?.plan.rows ?? []) {
    const o = m.get(a.referrer) ?? { lamports: 0n, periods: [] };
    if (!o.periods.includes(extra!.plan.period)) m.set(a.referrer, { lamports: o.lamports + a.amount, periods: [...o.periods, extra!.plan.period] });
  }
  const h = (await db.query<{ income: string; out: string }>(
    // sum(allocated) <= sum(income): each period allocates at most income + carry-in, and carry only ever comes from earlier income
    `SELECT (SELECT coalesce(sum(allocated_lamports), 0) FROM referral_income)::text AS income,
            (SELECT coalesce(sum(w.amount_lamports), 0) FROM referral_rewards w JOIN referral_income i ON i.period = w.period
              WHERE w.paid_sig IS NOT NULL OR w.pending_sig IS NOT NULL)::text AS out`)).rows[0];
  // dry-run plan not written yet: its allocation counts toward the headroom unless the period is already in the ledger
  const ledgered = extra ? (await db.query("SELECT 1 FROM referral_income WHERE period = $1", [extra.plan.period])).rowCount : 1;
  const headroom = BigInt(h.income) - BigInt(h.out) + (ledgered ? 0n : extra!.plan.allocated);
  return { owed: m, headroom };
}

/** Referral wallet signer. REFERRAL_KEYPAIR_JSON / REFERRAL_KEYPAIR_PATH (must match REFERRAL_WALLET). On devnet the platform key may
 *  double as the referral wallet. Without a key, dry-run still works (simulation only needs the public key); live refuses.
 *  The platform keypair never pays referrers on mainnet. */
export function referralSigner(platform: Keypair): Payer {
  const wallet = referralWallet();
  if (!wallet) throw new Error("REFERRAL_WALLET is not set");
  const json = process.env.REFERRAL_KEYPAIR_JSON?.trim(), file = process.env.REFERRAL_KEYPAIR_PATH?.trim();
  let kp: Keypair | null = null;
  if (json) { try { kp = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(json))); } catch { throw new Error("REFERRAL_KEYPAIR_JSON is not a valid secret key JSON array"); } }
  else if (file) kp = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(path.resolve(file), "utf8"))));
  if (kp && !kp.publicKey.equals(wallet)) throw new Error("REFERRAL_KEYPAIR does not match REFERRAL_WALLET");
  if (kp) {
    if (jobs.network === "mainnet" && kp.publicKey.equals(platform.publicKey)) throw new Error("referral wallet = platform key on mainnet: use separate wallets");
    return kp;
  }
  if (jobs.network !== "mainnet" && platform.publicKey.equals(wallet)) return platform;
  return { publicKey: wallet };
}

/** Move the WSOL income into the referral wallet's native SOL: close its WSOL ATA and re-create it in the SAME tx (swaps never see it
 *  missing; the rent comes back from the close). Signed by the referral wallet; dry-run simulates. */
export async function unwrapReferralWsol(signer: Payer, live: boolean): Promise<{ status: "none" | "would-unwrap" | "unwrapped" | "failed" | "skipped"; lamports: bigint; sig?: string; note?: string }> {
  const owner = signer.publicKey, ata = getAssociatedTokenAddressSync(NATIVE_MINT, owner, true);
  let configured: PublicKey | null = null;
  try { configured = process.env.PLATFORM_REFERRAL_TOKEN_ACCOUNT ? new PublicKey(process.env.PLATFORM_REFERRAL_TOKEN_ACCOUNT) : referralAta(); } catch {}
  if (configured && !configured.equals(ata)) return { status: "skipped", lamports: 0n, note: "PLATFORM_REFERRAL_TOKEN_ACCOUNT is not the referral wallet's WSOL ATA; sweep it by hand" };
  const conn = getConnection();
  if (!(await conn.getAccountInfo(ata, "confirmed"))) return { status: "none", lamports: 0n, note: "referral WSOL ATA missing" };
  const lamports = BigInt((await conn.getTokenAccountBalance(ata, "confirmed")).value.amount);
  if (lamports === 0n) return { status: "none", lamports };
  const t = new Transaction().add(createCloseAccountInstruction(ata, owner, owner), createAssociatedTokenAccountIdempotentInstruction(owner, ata, owner, NATIVE_MINT));
  const sim = await simulate(t, owner);
  if (!sim.ok) return { status: "failed", lamports, note: `simulation failed: ${sim.err}` };
  if (!live) return { status: "would-unwrap", lamports };
  if (!("secretKey" in signer)) throw new Error("live referral payouts need REFERRAL_KEYPAIR_PATH (or REFERRAL_KEYPAIR_JSON) for REFERRAL_WALLET");
  return { status: "unwrapped", lamports, sig: await sendOnce(t, [signer]) };
}

/** Pay unpaid referrer balances >= REFERRAL_MIN_PAYOUT_SOL (smaller ones roll over), capped at recorded income, from the referral wallet.
 *  `extra` = the dry-run plan not written yet. */
export async function payReferrals(signer: Payer, live: boolean, extra: { plan: ReferralPeriodPlan } | null = null) {
  if (live && !("secretKey" in signer)) throw new Error("live referral payouts need REFERRAL_KEYPAIR_PATH (or REFERRAL_KEYPAIR_JSON) for REFERRAL_WALLET; the platform key never pays referrers");
  if (live) await reconcile("referral_rewards");
  const o = await owed(extra);
  const all = [...o.owed].filter(([, v]) => v.lamports >= rewards2.referralMinPayout).map(([wallet, v]) => ({ wallet, lamports: v.lamports, ref: v.periods }));
  const { due, held } = withinIncome(all, o.headroom > 0n ? o.headroom : 0n);
  const res: { headroomLamports: bigint; held: number; unwrap?: Awaited<ReturnType<typeof unwrapReferralWsol>>; payouts: PayoutResult[] } = { headroomLamports: o.headroom, held: held.length, payouts: [] };
  if (!due.length) return res;
  res.unwrap = await unwrapReferralWsol(signer, live);
  res.payouts = await payBatches({
    payer: signer, live, due, batch: rewards2.payoutBatch, extraBalance: live ? 0n : res.unwrap.status === "would-unwrap" ? res.unwrap.lamports : 0n,
    memo: (b) => { const ps = [...new Set(b.flatMap((d) => d.ref))].sort(); return `highbar referral ${ps[0]}${ps.length > 1 ? `..${ps.at(-1)}` : ""}`; },
    markPending: async (sig, b) => { for (const d of b) await db.query("UPDATE referral_rewards SET pending_sig = $1, pending_at = $2 WHERE referrer = $3 AND period = ANY($4::text[]) AND paid_sig IS NULL AND pending_sig IS NULL", [sig, Date.now(), d.wallet, d.ref]); },
    markPaid: async (sig) => { await db.query("UPDATE referral_rewards SET paid_sig = pending_sig, paid_at = $2 WHERE pending_sig = $1", [sig, Date.now()]); },
  });
  return res;
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
      `SELECT period, referees, trades, volume_lamports::text AS v, referral_fee_lamports::text AS f, amount_lamports::text AS a, paid_sig, paid_at, pending_sig IS NOT NULL AS pending
         FROM referral_rewards WHERE referrer = $1 ORDER BY period DESC LIMIT $2`, [wallet, limit]);
    return rows.map((r) => ({ period: r.period as string, referees: r.referees as number, trades: r.trades as number, volumeSol: Number(r.v) / 1e9, referralFeeSol: Number(r.f) / 1e9,
      amountSol: Number(r.a) / 1e9, paidSig: r.paid_sig as string | null, paidAt: r.paid_at as number | null, pending: r.pending as boolean }));
  },
  async totals(wallet: string) {
    const r = (await db.query(
      `SELECT coalesce(max(period_end), 0) AS through FROM referral_income`, [])).rows[0];
    const mine = (await db.query(
      `SELECT coalesce(sum(amount_lamports) FILTER (WHERE paid_sig IS NOT NULL), 0)::text AS paid, coalesce(sum(amount_lamports) FILTER (WHERE paid_sig IS NULL), 0)::text AS unpaid
         FROM referral_rewards WHERE referrer = $1`, [wallet])).rows[0];
    return { paidSol: Number(mine.paid) / 1e9, unpaidSol: Number(mine.unpaid) / 1e9, closedThrough: Number(r.through) };
  },
  /** Upper-bound estimate for trades after the last closed period: rewardBps of the referral fee the referees' trades generated
   *  (the closed period can come out lower if the income pool is short). */
  async openEstimate(wallet: string, fromTs: number, rewardBps = rewards2.referralRewardBps) {
    const r = (await db.query<{ ref: string }>(
      `SELECT coalesce(sum(${REF_FEE(3)}), 0)::bigint::text AS ref
         FROM trades t JOIN referrals r ON r.referee = t.wallet
        WHERE r.referrer = $1 AND t.via_ui AND t.ts >= r.created_at AND t.ts >= $2`, [wallet, fromTs, REFERRAL_FEE_BPS_OF_TRADE_FEE])).rows[0];
    return Number((BigInt(r.ref) * BigInt(rewardBps)) / 10_000n) / 1e9;
  },
};