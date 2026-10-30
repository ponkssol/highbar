import type { Keypair } from "@solana/web3.js";
import { milestoneProgress, REWARD_PERIOD_MS, type Milestone, type MilestoneDay, type MilestoneProgress } from "@hb/shared";
import { db } from "../db/pool.js";
import { rewards2 } from "../jobs/rewardsConfig.js";
import { scoresStore } from "./scoresStore.js";
import { payBatches, reconcile, type PayoutResult } from "./payouts.js";

/** Milestone bonus (BUILD_BRIEF section 7): treasury pays creators whose token holds >= an mcap (SOL) for N full UTC days after migration.
 *  Market cap comes from the score job's hourly DAMM v2 snapshots (token_snapshots, source 'damm', migration 0003; the DBC price is
 *  frozen after migration) and the migration time from tokens.migrated_at. This module only reads them; it never samples prices. */
export const dayOf = (ms: number) => new Date(Math.floor(ms / REWARD_PERIOD_MS) * REWARD_PERIOD_MS).toISOString().slice(0, 10);

export interface Tracked { mint: string; creator: string; dammPool: string | null; migratedAt: number; symbol: string; name: string }
export interface Qualified { mint: string; creator: string; milestone: Milestone; qualifiedDay: string; lamports: bigint }

/** Migrated tokens with a known migration time (newest first). */
export async function tracked(opts: { creator?: string; mint?: string } = {}): Promise<Tracked[]> {
  const { rows } = await db.query(
    `SELECT mint, creator, damm_pool, migrated_at, coalesce(symbol, '') AS symbol, coalesce(name, '') AS name FROM tokens
      WHERE is_migrated AND migrated_at IS NOT NULL AND ($1::text IS NULL OR creator = $1) AND ($2::text IS NULL OR mint = $2) ORDER BY migrated_at DESC`,
    [opts.creator ?? null, opts.mint ?? null]);
  return rows.map((r) => ({ mint: r.mint, creator: r.creator, dammPool: r.damm_pool, migratedAt: Number(r.migrated_at), symbol: r.symbol, name: r.name }));
}

/** Fold snapshots into UTC days: lowest mcap and number of samples per day (ascending). */
export function dailyFromSnaps(snaps: { ts: number; mcapSol: number }[]): MilestoneDay[] {
  const by = new Map<string, MilestoneDay>();
  for (const s of snaps) {
    const day = dayOf(s.ts), d = by.get(day);
    if (d) { d.minMcapSol = Math.min(d.minMcapSol, s.mcapSol); d.samples++; } else by.set(day, { day, minMcapSol: s.mcapSol, samples: 1 });
  }
  return [...by.values()].sort((a, b) => (a.day < b.day ? -1 : 1));
}

/** Per mint: daily rollup + latest DAMM snapshot. */
export async function snapshots(mints: string[]): Promise<Map<string, { days: MilestoneDay[]; last: { ts: number; mcapSol: number } | null }>> {
  const raw = await scoresStore.dammSnapshots(mints);
  return new Map(mints.map((m) => { const s = raw.get(m) ?? []; return [m, { days: dailyFromSnaps(s), last: s.at(-1) ?? null }]; }));
}

/** Progress of every milestone for a token; only CLOSED UTC days count. */
export function progressFor(t: Pick<Tracked, "migratedAt">, days: MilestoneDay[], ms: Milestone[] = rewards2.milestones, now = Date.now(), minSamples = rewards2.milestoneMinSamples): MilestoneProgress[] {
  const today = dayOf(now), closed = days.filter((d) => d.day < today);
  return ms.map((m) => milestoneProgress(m, dayOf(t.migratedAt), closed, minSamples));
}

/** Tokens that newly qualified for a milestone (no bonus row yet). Creators in `exclude` (platform wallets) never qualify. */
export async function evaluate(exclude: string[], now = Date.now()): Promise<Qualified[]> {
  const ts = (await tracked()).filter((t) => !exclude.includes(t.creator));
  const snaps = await snapshots(ts.map((t) => t.mint));
  const have = new Set((await db.query<{ k: string }>("SELECT mint || ':' || milestone AS k FROM milestone_bonuses")).rows.map((r) => r.k));
  const out: Qualified[] = [];
  for (const t of ts) for (const p of progressFor(t, snaps.get(t.mint)?.days ?? [], rewards2.milestones, now)) {
    const m = rewards2.milestones.find((x) => x.id === p.id)!;
    if (p.qualified && !have.has(`${t.mint}:${m.id}`) && m.rewardSol > 0)
      out.push({ mint: t.mint, creator: t.creator, milestone: m, qualifiedDay: p.qualifiedDay!, lamports: BigInt(Math.round(m.rewardSol * 1e9)) });
  }
  return out;
}

export async function writeBonuses(q: Qualified[]) {
  const now = Date.now();
  for (const b of q) await db.query(
    `INSERT INTO milestone_bonuses (mint, milestone, creator, mcap_sol, days, amount_lamports, qualified_day, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (mint, milestone) DO NOTHING`,
    [b.mint, b.milestone.id, b.creator, b.milestone.mcapSol, b.milestone.days, b.lamports.toString(), b.qualifiedDay, now]);
}

/** Pay unpaid bonuses (oldest first, up to MILESTONE_MAX_PAYOUT_PER_RUN_SOL). `extra` = dry-run qualifications not written yet. */
export async function payMilestones(payer: Keypair, live: boolean, extra: Qualified[] = []): Promise<PayoutResult[]> {
  if (live) await reconcile("milestone_bonuses");
  const { rows } = await db.query<{ mint: string; milestone: string; creator: string; amount: string }>(
    "SELECT mint, milestone, creator, amount_lamports::text AS amount FROM milestone_bonuses WHERE paid_sig IS NULL AND pending_sig IS NULL ORDER BY created_at, mint, milestone");
  const items = [...rows.map((r) => ({ key: `${r.mint}:${r.milestone}`, creator: r.creator, lamports: BigInt(r.amount) })),
    ...extra.map((q) => ({ key: `${q.mint}:${q.milestone.id}`, creator: q.creator, lamports: q.lamports }))];
  const cap = rewards2.milestoneMaxPerRun;
  let spent = 0n;
  const picked = items.filter((i) => { if (cap > 0n && spent + i.lamports > cap) return false; spent += i.lamports; return true; });
  // one transfer per bonus (a creator may appear twice); ref = "mint:milestone"
  const due = picked.map((i) => ({ wallet: i.creator, lamports: i.lamports, ref: [i.key] }));
  return payBatches({
    payer, live, due, batch: rewards2.payoutBatch,
    memo: (b) => `highbar milestone ${b.map((d) => d.ref[0].split(":")[1]).filter((v, i, a) => a.indexOf(v) === i).join(",")}`.slice(0, 120),
    markPending: async (sig, b) => { for (const d of b) { const [mint, ms] = d.ref[0].split(":"); await db.query("UPDATE milestone_bonuses SET pending_sig = $1, pending_at = $2 WHERE mint = $3 AND milestone = $4 AND paid_sig IS NULL AND pending_sig IS NULL", [sig, Date.now(), mint, ms]); } },
    markPaid: async (sig) => { await db.query("UPDATE milestone_bonuses SET paid_sig = pending_sig, paid_at = $2 WHERE pending_sig = $1", [sig, Date.now()]); },
  });
}

export const milestoneStore = {
  async bonuses(opts: { creator?: string; mint?: string; limit?: number } = {}) {
    const { rows } = await db.query(
      `SELECT b.mint, b.milestone, b.creator, b.mcap_sol, b.days, b.amount_lamports::text AS a, b.qualified_day, b.paid_sig, b.paid_at, b.pending_sig IS NOT NULL AS pending, b.created_at,
              coalesce(k.symbol, '') AS symbol, coalesce(k.name, '') AS name
         FROM milestone_bonuses b LEFT JOIN tokens k ON k.mint = b.mint
        WHERE ($1::text IS NULL OR b.creator = $1) AND ($2::text IS NULL OR b.mint = $2) ORDER BY b.created_at DESC LIMIT $3`, [opts.creator ?? null, opts.mint ?? null, opts.limit ?? 100]);
    return rows.map((r) => ({ mint: r.mint as string, milestone: r.milestone as string, creator: r.creator as string, mcapSol: r.mcap_sol as number, days: r.days as number, amountSol: Number(r.a) / 1e9,
      qualifiedDay: r.qualified_day as string, paidSig: r.paid_sig as string | null, paidAt: r.paid_at as number | null, pending: r.pending as boolean, createdAt: Number(r.created_at), symbol: r.symbol as string, name: r.name as string }));
  },
};
