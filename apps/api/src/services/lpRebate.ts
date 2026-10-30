import type { Keypair } from "@solana/web3.js";
import { LP_REBATE_BPS, lpRebateLamports, type TierId } from "@hb/shared";
import { getClient } from "@hb/onchain";
import { db } from "../db/pool.js";
import { rewards2 } from "../jobs/rewardsConfig.js";
import { isKey, payBatches, reconcile, type Due, type PayoutResult } from "./payouts.js";

/** Creator LP rebate (post-migration). The DAMM v2 pool fee stays 1% and the LP split is unchanged on-chain; the platform forwards
 *  LP_REBATE_BPS[tier] (packages/shared: 6875 / 6875 / 7500 bps, fixed in code) of the LP SOL it actually CLAIMED on its own locked
 *  position (fee_claims source 'damm_lp', measured from the vault outflow) to the token's creator. Net share of post-migration volume:
 *  creator 0.60 / 0.65 / 0.70 %, platform 0.20 / 0.15 / 0.10 %, Meteora 0.20 %.
 *  - one creator_lp_rebates row per damm_lp claim (claim sig + pool), so accrual is idempotent; rebate = floor(claimed * bps / 10000),
 *    the rounding dust stays in the platform gross (-> treasury via the split);
 *  - recipient = the on-chain DBC pool creator read at accrual time (follows transferPoolCreator), even if the creator LP NFT was sold;
 *    platform / treasury / referral wallets and off-curve addresses are recorded with skip_reason and rebate 0;
 *  - base-token LP fees (should be 0 with collect mode OnlyB) are never rebated; the job raises an ALERT line when one shows up;
 *  - payouts are aggregated per creator wallet with payBatches (simulate in dry-run; live = sign once, pending sig saved before send,
 *    payer balance + 0.01 SOL buffer check); wallets below LP_REBATE_MIN_PAYOUT_SOL carry over to the next run;
 *  - the treasury split deducts the period's rebates from gross BEFORE cashback and 40/50/10 (treasury.ts / split.ts).
 *  Paid by the platform keypair (payer). The treasury is a single wallet for now; if it becomes a Squads vault, the payer needs top-ups
 *  from it to cover rebates (not handled here). */

export interface LpClaim { sig: string; pool: string; mint: string; lamports: bigint; baseAmount: bigint; tier: TierId | null; dbcPool: string | null }
export interface Rebate {
  claimSig: string; pool: string; mint: string; tier: string; creator: string;
  claimedLamports: bigint; baseAmount: bigint; rebateBps: number; rebateLamports: bigint; skipReason: string | null;
}
export interface UnpaidRebate { creator: string; ref: string; lamports: bigint }
export interface RebateStore {
  /** damm_lp fee claims without a rebate row (oldest first). */
  unaccrued(): Promise<LpClaim[]>;
  /** Insert rows; existing (claim_sig, pool) keys are left untouched. Returns the number inserted. */
  insert(rows: Rebate[]): Promise<number>;
  /** Non-skipped rebates > 0 not paid and not pending. ref = "claimSig:pool". */
  unpaid(): Promise<UnpaidRebate[]>;
  markPending(sig: string, b: Due[]): Promise<void>;
  markPaid(sig: string): Promise<void>;
  reconcile(): Promise<void>;
}
/** wallet -> label ("platform" | "treasury" | "referral"): creators that never receive a rebate. */
export type Excluded = Map<string, string>;

export const refOf = (r: { claimSig: string; pool: string }) => `${r.claimSig}:${r.pool}`;

/** Rebate row for one claim and its creator (pure). */
export function planRebate(c: LpClaim, creator: string, exclude: Excluded): Rebate {
  const base = { claimSig: c.sig, pool: c.pool, mint: c.mint, claimedLamports: c.lamports, baseAmount: c.baseAmount };
  if (!c.tier) return { ...base, tier: "", creator, rebateBps: 0, rebateLamports: 0n, skipReason: "token not indexed" };
  const bps = LP_REBATE_BPS[c.tier];
  const skip = exclude.has(creator) ? `creator is the ${exclude.get(creator)} wallet` : !isKey(creator) ? "creator is not an on-curve wallet" : null;
  return { ...base, tier: c.tier, creator, rebateBps: bps, rebateLamports: skip ? 0n : lpRebateLamports(c.tier, c.lamports), skipReason: skip };
}

/** Plan rows for every unaccrued claim. A claim whose creator can't be read (RPC) stays unaccrued and is retried next run. */
export async function accrueRebates(store: RebateStore, creatorOf: (dbcPool: string) => Promise<string | null>, exclude: Excluded, log: (m: string) => void = console.log) {
  const rows: Rebate[] = [], alerts: string[] = [];
  let unresolved = 0;
  for (const c of await store.unaccrued()) {
    if (c.baseAmount > 0n) {
      const a = `ALERT base-side LP fee ${c.baseAmount} in claim ${c.sig} (pool ${c.pool}, mint ${c.mint}): expected 0 with collect mode OnlyB; only the SOL side is rebated`;
      alerts.push(a); log(`[lprebate] ${a}`);
    }
    let creator = "";
    if (c.tier && c.dbcPool) {
      const got = await creatorOf(c.dbcPool).catch(() => null);
      if (!got) { unresolved++; log(`[lprebate] creator of ${c.mint} (DBC pool ${c.dbcPool}) unreadable; retry next run`); continue; }
      creator = got;
    }
    rows.push(planRebate(c, creator, exclude));
  }
  return { rows, alerts, unresolved };
}

/** Aggregate per creator: >= min -> one transfer (refs = all its rebates), else carried over. */
export function dueByCreator(items: UnpaidRebate[], min: bigint) {
  const by = new Map<string, Due>();
  for (const i of items) {
    if (i.lamports <= 0n) continue;
    const d = by.get(i.creator) ?? { wallet: i.creator, lamports: 0n, ref: [] };
    d.lamports += i.lamports; d.ref.push(i.ref); by.set(i.creator, d);
  }
  const all = [...by.values()];
  return { due: all.filter((d) => d.lamports >= min), carried: all.filter((d) => d.lamports < min).map((d) => ({ wallet: d.wallet, lamports: d.lamports })) };
}

export async function payRebates(o: { store: RebateStore; payer: Keypair; live: boolean; min: bigint; batch: number; extra?: Rebate[]; pay?: typeof payBatches }) {
  if (o.live) await o.store.reconcile();
  const items = [...await o.store.unpaid(),
    ...(o.extra ?? []).filter((r) => !r.skipReason && r.rebateLamports > 0n).map((r) => ({ creator: r.creator, ref: refOf(r), lamports: r.rebateLamports }))];
  const { due, carried } = dueByCreator(items, o.min);
  const payouts: PayoutResult[] = await (o.pay ?? payBatches)({
    payer: o.payer, live: o.live, due, batch: o.batch,
    memo: (b) => `highbar lp rebate ${b.reduce((a, d) => a + d.ref.length, 0)} claim(s)`,
    markPending: (sig, b) => o.store.markPending(sig, b),
    markPaid: (sig) => o.store.markPaid(sig),
  });
  return { payouts, carried };
}

/** DBC pool creator on-chain (current, so a transferPoolCreator is honoured). */
export async function chainCreatorOf(dbcPool: string): Promise<string | null> {
  const raw: any = await getClient().state.getPool(dbcPool);
  const ps: any = raw?.poolState ?? raw;
  return ps?.creator ? ps.creator.toBase58() : null;
}

export const pgRebateStore: RebateStore = {
  async unaccrued() {
    const { rows } = await db.query<{ sig: string; pool: string; mint: string; lamports: string; base_amount: string | null; tier: TierId | null; dbc_pool: string | null }>(
      `SELECT f.sig, f.pool, f.mint, f.lamports::text, f.base_amount::text, k.tier, k.pool AS dbc_pool
         FROM fee_claims f LEFT JOIN creator_lp_rebates r ON r.claim_sig = f.sig AND r.pool = f.pool LEFT JOIN tokens k ON k.mint = f.mint
        WHERE f.source = 'damm_lp' AND r.claim_sig IS NULL ORDER BY f.claimed_at, f.sig`);
    return rows.map((r) => ({ sig: r.sig, pool: r.pool, mint: r.mint, lamports: BigInt(r.lamports), baseAmount: BigInt(r.base_amount || "0"), tier: r.tier, dbcPool: r.dbc_pool }));
  },
  async insert(rows) {
    let n = 0;
    const now = Date.now();
    for (const r of rows) n += (await db.query(
      `INSERT INTO creator_lp_rebates (claim_sig, pool, mint, tier, creator, claimed_lamports, base_amount, rebate_bps, rebate_lamports, skip_reason, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT (claim_sig, pool) DO NOTHING`,
      [r.claimSig, r.pool, r.mint, r.tier, r.creator, r.claimedLamports.toString(), r.baseAmount.toString(), r.rebateBps, r.rebateLamports.toString(), r.skipReason, now])).rowCount ?? 0;
    return n;
  },
  async unpaid() {
    const { rows } = await db.query<{ creator: string; ref: string; l: string }>(
      `SELECT creator, claim_sig || ':' || pool AS ref, rebate_lamports::text AS l FROM creator_lp_rebates
        WHERE paid_sig IS NULL AND pending_sig IS NULL AND skip_reason IS NULL AND rebate_lamports > 0 ORDER BY created_at, claim_sig`);
    return rows.map((r) => ({ creator: r.creator, ref: r.ref, lamports: BigInt(r.l) }));
  },
  async markPending(sig, b) {
    for (const d of b) await db.query(
      `UPDATE creator_lp_rebates SET pending_sig = $1, pending_at = $2
        WHERE creator = $3 AND claim_sig || ':' || pool = ANY($4::text[]) AND paid_sig IS NULL AND pending_sig IS NULL AND skip_reason IS NULL`,
      [sig, Date.now(), d.wallet, d.ref]);
  },
  async markPaid(sig) { await db.query("UPDATE creator_lp_rebates SET paid_sig = pending_sig, paid_at = $2 WHERE pending_sig = $1", [sig, Date.now()]); },
  reconcile: () => reconcile("creator_lp_rebates"),
};

/** Dry-run estimate of the rebates on this run's would-be damm_lp claims (DB creator / tier; the live job reads the on-chain creator). */
export async function estimateRebates(claims: { mint: string; lamports: bigint }[], exclude: Excluded): Promise<bigint> {
  if (!claims.length) return 0n;
  const { rows } = await db.query<{ mint: string; tier: TierId; creator: string }>("SELECT mint, tier, creator FROM tokens WHERE mint = ANY($1::text[])", [[...new Set(claims.map((c) => c.mint))]]);
  const by = new Map(rows.map((r) => [r.mint, r]));
  return claims.reduce((a, c) => {
    const t = by.get(c.mint);
    return t && !exclude.has(t.creator) && isKey(t.creator) ? a + lpRebateLamports(t.tier, c.lamports) : a;
  }, 0n);
}

/** lprebate job: accrue rows for new damm_lp claims (live: write them), then pay creators at or above the minimum. */
export async function runLpRebate(o: {
  payer: Keypair; live: boolean; exclude: Excluded; log?: (m: string) => void;
  store?: RebateStore; creatorOf?: (dbcPool: string) => Promise<string | null>; min?: bigint; batch?: number; pay?: typeof payBatches;
}) {
  const store = o.store ?? pgRebateStore, log = o.log ?? console.log;
  const acc = await accrueRebates(store, o.creatorOf ?? chainCreatorOf, o.exclude, log);
  const written = o.live ? await store.insert(acc.rows) : 0;
  const { payouts, carried } = await payRebates({ store, payer: o.payer, live: o.live, min: o.min ?? rewards2.lpRebateMinPayout, batch: o.batch ?? rewards2.payoutBatch, extra: o.live ? [] : acc.rows, pay: o.pay });
  const accrued = acc.rows.filter((r) => !r.skipReason).reduce((a, r) => a + r.rebateLamports, 0n);
  return {
    claims: acc.rows.length, written, accruedLamports: accrued, unresolved: acc.unresolved, alerts: acc.alerts,
    skipped: acc.rows.filter((r) => r.skipReason).map((r) => ({ claim: refOf(r), mint: r.mint, creator: r.creator, reason: r.skipReason })),
    payouts, carried,
    /** this run's planned (unwritten in dry-run) rebate total, for the dry-run split preview */
    plannedLamports: o.live ? 0n : accrued,
  };
}

/** API reads: a creator's rebate history and unpaid totals. */
export const rebateStore = {
  async forCreator(creator: string, limit = 100) {
    const { rows } = await db.query(
      `SELECT r.claim_sig, r.pool, r.mint, r.tier, r.claimed_lamports::text AS c, r.rebate_bps, r.rebate_lamports::text AS l, r.period, r.paid_sig, r.paid_at,
              r.pending_sig IS NOT NULL AS pending, r.skip_reason, r.created_at, coalesce(k.symbol, '') AS symbol, coalesce(k.name, '') AS name
         FROM creator_lp_rebates r LEFT JOIN tokens k ON k.mint = r.mint WHERE r.creator = $1 ORDER BY r.created_at DESC LIMIT $2`, [creator, limit]);
    const t = await db.query<{ unpaid: string; paid: string }>(
      `SELECT coalesce(sum(rebate_lamports) FILTER (WHERE paid_sig IS NULL), 0)::text AS unpaid, coalesce(sum(rebate_lamports) FILTER (WHERE paid_sig IS NOT NULL), 0)::text AS paid
         FROM creator_lp_rebates WHERE creator = $1 AND skip_reason IS NULL`, [creator]);
    return {
      rows: rows.map((r) => ({ claimSig: r.claim_sig as string, pool: r.pool as string, mint: r.mint as string, symbol: r.symbol as string, name: r.name as string, tier: r.tier as string,
        claimedSol: Number(r.c) / 1e9, rebateBps: r.rebate_bps as number, rebateSol: Number(r.l) / 1e9, period: r.period as string | null,
        paidSig: r.paid_sig as string | null, paidAt: r.paid_at === null ? null : Number(r.paid_at), pending: r.pending as boolean, skipReason: r.skip_reason as string | null, createdAt: Number(r.created_at) })),
      pendingSol: Number(t.rows[0].unpaid) / 1e9, paidSol: Number(t.rows[0].paid) / 1e9,
    };
  },
};
