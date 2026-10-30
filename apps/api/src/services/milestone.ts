import { PublicKey, type Keypair } from "@solana/web3.js";
import { NATIVE_MINT } from "@solana/spl-token";
import { CpAmm, getPriceFromSqrtPrice } from "@meteora-ag/cp-amm-sdk";
import { DAMM_V2_MIGRATION_FEE_ADDRESS, deriveDammV2PoolAddress } from "@meteora-ag/dynamic-bonding-curve-sdk";
import { milestoneProgress, REWARD_PERIOD_MS, type Milestone, type MilestoneDay, type MilestoneProgress } from "@hb/shared";
import { getClient, getConnection, withRetry } from "@hb/onchain";
import { db } from "../db/pool.js";
import { rewards2 } from "../jobs/rewardsConfig.js";
import { payBatches, reconcile, type PayoutResult } from "./payouts.js";

/** Milestone bonus (BUILD_BRIEF section 7): treasury pays creators whose token holds >= an mcap (SOL) for N full UTC days after migration.
 *  After migration the DBC pool price is frozen, so the tracker samples the DAMM v2 pool price (tokenA = our mint, tokenB = SOL). */
const SUPPLY = 1_000_000_000;
export const dayOf = (ms: number) => new Date(Math.floor(ms / REWARD_PERIOD_MS) * REWARD_PERIOD_MS).toISOString().slice(0, 10);

export interface Tracked { mint: string; creator: string; dammPool: string | null; migratedAt: number; lastMcapSol: number | null; lastSampledAt: number | null; config: string; symbol: string; name: string }
export interface Qualified { mint: string; creator: string; milestone: Milestone; qualifiedDay: string; lamports: bigint }

/** Add newly migrated tokens to milestone_tokens (migrated_at = graduate activity ts, else now). */
export async function syncTracked() {
  await db.query(
    `INSERT INTO milestone_tokens (mint, creator, migrated_at, updated_at)
     SELECT k.mint, k.creator, coalesce(a.ts, $1), $1 FROM tokens k LEFT JOIN activity a ON a.id = 'graduate:' || k.mint
      WHERE k.is_migrated ON CONFLICT (mint) DO UPDATE SET creator = EXCLUDED.creator`, [Date.now()]);
}
export async function tracked(): Promise<Tracked[]> {
  const { rows } = await db.query(
    `SELECT m.mint, m.creator, m.damm_pool, m.migrated_at, m.last_mcap_sol, m.last_sampled_at, k.config, coalesce(k.symbol, '') AS symbol, coalesce(k.name, '') AS name
       FROM milestone_tokens m JOIN tokens k ON k.mint = m.mint ORDER BY m.migrated_at DESC`);
  return rows.map((r) => ({ mint: r.mint, creator: r.creator, dammPool: r.damm_pool, migratedAt: Number(r.migrated_at), lastMcapSol: r.last_mcap_sol, lastSampledAt: r.last_sampled_at, config: r.config, symbol: r.symbol, name: r.name }));
}

const amm = () => new CpAmm(getConnection());
const cfgCache = new Map<string, number>();
/** DAMM v2 pool for a migrated DBC token: derive from the config's migrationFeeOption, else search by tokenA mint. */
async function findDammPool(t: Tracked): Promise<PublicKey | null> {
  const mint = new PublicKey(t.mint);
  try {
    let opt = cfgCache.get(t.config);
    if (opt === undefined) { const c = await withRetry(() => getClient().state.getPoolConfig(t.config)); if (!c) return null; opt = Number(c.migrationFeeOption); cfgCache.set(t.config, opt); }
    const dammConfig = DAMM_V2_MIGRATION_FEE_ADDRESS[opt];
    if (dammConfig) {
      const pda = deriveDammV2PoolAddress(dammConfig, mint, NATIVE_MINT);
      if (await getConnection().getAccountInfo(pda)) return pda;
    }
  } catch { /* fall through */ }
  const pools = await amm().fetchPoolStatesByTokenAMint(mint).catch(() => []);
  const sol = pools.filter((p) => p.account.tokenBMint.equals(NATIVE_MINT)).sort((a, b) => (b.account.liquidity.gt(a.account.liquidity) ? 1 : -1));
  return sol[0]?.publicKey ?? null;
}

export async function sampleMcap(t: Tracked): Promise<{ mcapSol: number; pool: string } | { error: string }> {
  const pool = t.dammPool ? new PublicKey(t.dammPool) : await findDammPool(t);
  if (!pool) return { error: "DAMM v2 pool not found" };
  const ps = await withRetry(() => amm().fetchPoolState(pool));
  const price = Number(getPriceFromSqrtPrice(ps.sqrtPrice, 6, 9).toString());
  if (!Number.isFinite(price) || price <= 0) return { error: "bad pool price" };
  return { mcapSol: price * SUPPLY, pool: pool.toBase58() };
}

/** Fold one sample into the token's UTC-day snapshot (observations only; no funds move). */
export async function recordSample(mint: string, pool: string, mcapSol: number, ts = Date.now()) {
  await db.query(
    `INSERT INTO milestone_snapshots (mint, day, min_mcap_sol, max_mcap_sol, last_mcap_sol, samples, updated_at) VALUES ($1,$2,$3,$3,$3,1,$4)
     ON CONFLICT (mint, day) DO UPDATE SET min_mcap_sol = LEAST(milestone_snapshots.min_mcap_sol, EXCLUDED.min_mcap_sol),
       max_mcap_sol = GREATEST(milestone_snapshots.max_mcap_sol, EXCLUDED.max_mcap_sol), last_mcap_sol = EXCLUDED.last_mcap_sol,
       samples = milestone_snapshots.samples + 1, updated_at = EXCLUDED.updated_at`, [mint, dayOf(ts), mcapSol, ts]);
  await db.query("UPDATE milestone_tokens SET damm_pool = $2, last_mcap_sol = $3, last_sampled_at = $4, updated_at = $4 WHERE mint = $1", [mint, pool, mcapSol, ts]);
}

/** Sample every tracked token once. */
export async function trackAll(log: (m: string) => void) {
  await syncTracked();
  const out: { mint: string; mcapSol?: number; error?: string }[] = [];
  for (const t of await tracked()) {
    try {
      const s = await sampleMcap(t);
      if ("error" in s) out.push({ mint: t.mint, error: s.error });
      else { await recordSample(t.mint, s.pool, s.mcapSol); out.push({ mint: t.mint, mcapSol: s.mcapSol }); }
    } catch (e) { out.push({ mint: t.mint, error: (e as Error).message }); }
  }
  log(`[milestone] sampled ${out.filter((o) => o.mcapSol !== undefined).length}/${out.length} migrated tokens`);
  return out;
}

export async function snapshots(mints: string[]): Promise<Map<string, MilestoneDay[]>> {
  if (!mints.length) return new Map();
  const { rows } = await db.query<{ mint: string; day: string; min_mcap_sol: number; samples: number }>(
    "SELECT mint, day, min_mcap_sol, samples FROM milestone_snapshots WHERE mint = ANY($1::text[]) ORDER BY mint, day", [mints]);
  const m = new Map<string, MilestoneDay[]>();
  for (const r of rows) { const a = m.get(r.mint) ?? []; a.push({ day: r.day, minMcapSol: r.min_mcap_sol, samples: r.samples }); m.set(r.mint, a); }
  return m;
}

/** Progress of every milestone for a token; only CLOSED UTC days count. */
export function progressFor(t: Pick<Tracked, "migratedAt">, days: MilestoneDay[], ms: Milestone[] = rewards2.milestones, now = Date.now()): MilestoneProgress[] {
  const today = dayOf(now), closed = days.filter((d) => d.day < today);
  return ms.map((m) => milestoneProgress(m, dayOf(t.migratedAt), closed, rewards2.milestoneMinSamples));
}

/** Tokens that newly qualified for a milestone (no bonus row yet). Creators in `exclude` (platform wallets) never qualify. */
export async function evaluate(exclude: string[], now = Date.now()): Promise<Qualified[]> {
  const ts = (await tracked()).filter((t) => !exclude.includes(t.creator));
  const snaps = await snapshots(ts.map((t) => t.mint));
  const have = new Set((await db.query<{ k: string }>("SELECT mint || ':' || milestone AS k FROM milestone_bonuses")).rows.map((r) => r.k));
  const out: Qualified[] = [];
  for (const t of ts) for (const p of progressFor(t, snaps.get(t.mint) ?? [], rewards2.milestones, now)) {
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
  // one transfer per bonus (creator may appear twice); ref = "mint:milestone"
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
