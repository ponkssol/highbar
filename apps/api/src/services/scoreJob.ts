import { NATIVE_MINT } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import { CpAmm, getPriceFromSqrtPrice } from "@meteora-ag/cp-amm-sdk";
import { DAMM_V2_MIGRATION_FEE_ADDRESS, deriveDammV2PoolAddress } from "@meteora-ag/dynamic-bonding-curve-sdk";
import { getClient, getConnection, withRetry } from "@hb/onchain";
import { store } from "../store.js";
import { computeScore, HOLDER_MIN_TOKENS, TOTAL_SUPPLY } from "./score.js";
import { scoresStore } from "./scoresStore.js";
import { batchFetch, planDammReads } from "./dammBatch.js";

const HOUR = 3_600_000;
type DammState = Awaited<ReturnType<CpAmm["fetchPoolState"]>>;
/** Hour bucket of the last DAMM v2 price pass (in memory: a restart re-reads once, harmless). */
let lastDammBucket: number | null = null;

/** DAMM v2 pool states for many pools with getMultipleAccounts, 100 per call (was one getAccountInfo per token per run). */
async function dammStates(amm: CpAmm, pools: string[]): Promise<Map<string, DammState>> {
  const keys = pools.map((p) => new PublicKey(p));
  const infos = await batchFetch(keys, (chunk) => withRetry(() => getConnection().getMultipleAccountsInfo(chunk)));
  const out = new Map<string, DammState>();
  infos.forEach((info, i) => {
    if (!info) return;
    try { out.set(pools[i], amm._program.coder.accounts.decode<DammState>("pool", info.data)); } catch { /* not a DAMM v2 pool account */ }
  });
  return out;
}

/** Our DAMM v2 pool address for a graduated token, derived like the keeper migrated it (DBC config's migrationFeeOption, or DAMM_V2_CONFIG). */
async function derivedDammPool(mint: string, config: string, cfgCache: Map<string, Promise<{ migrationFeeOption: unknown } | null>>): Promise<string | null> {
  let dammConfig: PublicKey | undefined;
  if (process.env.DAMM_V2_CONFIG) dammConfig = new PublicKey(process.env.DAMM_V2_CONFIG);
  else {
    if (!cfgCache.has(config)) cfgCache.set(config, withRetry(() => getClient().state.getPoolConfig(new PublicKey(config))).catch(() => null));
    const cfg = await cfgCache.get(config)!;
    dammConfig = cfg ? DAMM_V2_MIGRATION_FEE_ADDRESS[Number(cfg.migrationFeeOption)] : undefined;
  }
  return dammConfig ? deriveDammV2PoolAddress(dammConfig, new PublicKey(mint), NATIVE_MINT).toBase58() : null;
}

/** Fallback when the known / derived pool is missing: getProgramAccounts by token A mint, token/WSOL pool with the most liquidity. */
async function dammPoolByMint(amm: CpAmm, mint: string): Promise<{ pool: string; state: DammState } | null> {
  const found = (await withRetry(() => amm.fetchPoolStatesByTokenAMint(new PublicKey(mint))))
    .filter((p) => p.account.tokenBMint.equals(NATIVE_MINT))
    .sort((a, b) => (b.account.liquidity.gt(a.account.liquidity) ? 1 : -1));
  return found.length ? { pool: found[0].publicKey.toBase58(), state: found[0].account } : null;
}
const priceOf = (st: DammState) => Number(getPriceFromSqrtPrice(st.sqrtPrice, 6, 9).toString());

/** Recompute highbar scores + holders for every token and write an hourly price snapshot
 *  (curve price while bonding, DB only, every run; DAMM v2 pool price after migration when `rpc`: read in batches of 100
 *  once per hour bucket, plus every run for a fresh migration whose pool is not known yet). Off-chain only; sends nothing. */
export async function runScores(log: (m: string) => void = console.log, opts: { rpc?: boolean } = {}) {
  const now = Date.now(), nowSec = Math.floor(now / 1000), bucket = Math.floor(now / HOUR) * HOUR;
  const [tokens, balances, locks, mig] = await Promise.all([store.tokens(), scoresStore.tradeBalances(), scoresStore.activeLocks(nowSec), scoresStore.migrationInfo()]);
  let scored = 0, snaps = 0;
  const graduated: { t: (typeof tokens)[number]; m: { migratedAt: number | null; dammPool: string | null } | undefined }[] = [];
  for (const t of tokens) {
    const lock = locks.get(t.mint) ?? null;
    // dev tokens moved into a lock escrow are no longer in the creator wallet: the balance (concentration) is net of the lock,
    // but the creator stays a holder (HOLDER_MIN_TOKENS rule, same count as the Holders tab and scoresStore.holderCounts)
    const raw = balances.get(t.mint) ?? [];
    const holders = raw
      .map((h) => (h.wallet === t.creator && lock ? { ...h, balance: Math.max(0, h.balance - lock.lockedTokens) } : h))
      .filter((h) => h.balance > HOLDER_MIN_TOKENS || h.wallet === t.creator);
    const r = computeScore({ tier: t.tier, antiSniper: t.antiSniper, lock, balances: holders.map((h) => h.balance), holders: holders.length, nowSec });
    await scoresStore.saveScore(t.mint, r.score, { ...r.breakdown, label: r.label }, holders, now);
    scored++;
    if (!t.isMigrated) { await scoresStore.addSnapshot(t.mint, bucket, t.priceSol, t.mcapSol, "curve"); snaps++; continue; }
    const m = mig.get(t.mint);
    if (m && m.migratedAt == null) await scoresStore.markMigrated(t.mint, now); // legacy rows: the poller stamps new graduations
    graduated.push({ t, m });
  }
  if (opts.rpc !== false && graduated.length) snaps += await dammSnapshots(graduated, bucket, log);
  log(`scores: ${scored} tokens scored, ${snaps} snapshots`);
  return { scored, snapshots: snaps };
}

/** DAMM v2 price snapshots for graduated tokens (see planDammReads): known / derived pools in one batched read. */
async function dammSnapshots(graduated: { t: { mint: string; config: string }; m: { dammPool: string | null } | undefined }[], bucket: number, log: (m: string) => void): Promise<number> {
  const plan = planDammReads(graduated.map((g) => ({ mint: g.t.mint, dammPool: g.m?.dammPool ?? null })), bucket, lastDammBucket);
  if (!plan.mints.length) return 0;
  const want = new Set(plan.mints), amm = new CpAmm(getConnection()), cfgCache = new Map<string, Promise<{ migrationFeeOption: unknown } | null>>();
  const targets: { mint: string; known: string | null; pool: string | null }[] = [];
  for (const g of graduated) {
    if (!want.has(g.t.mint)) continue;
    const known = g.m?.dammPool ?? null;
    targets.push({ mint: g.t.mint, known, pool: known ?? await derivedDammPool(g.t.mint, g.t.config, cfgCache).catch(() => null) });
  }
  let states: Map<string, DammState>;
  try { states = await dammStates(amm, [...new Set(targets.flatMap((x) => (x.pool ? [x.pool] : [])))]); }
  catch (e) { log(`scores: DAMM batch read failed, retried next run: ${(e as Error).message}`); return 0; }
  let snaps = 0;
  for (const x of targets) {
    try {
      let pool = x.pool, st = pool ? states.get(pool) ?? null : null;
      if (!st) { const f = await dammPoolByMint(amm, x.mint); if (f) { pool = f.pool; st = f.state; } }
      if (!st || !pool) { log(`scores: no DAMM v2 pool found for ${x.mint}`); continue; }
      if (pool !== x.known) await scoresStore.setDammPool(x.mint, pool);
      const p = priceOf(st);
      await scoresStore.addSnapshot(x.mint, bucket, p, p * TOTAL_SUPPLY, "damm"); snaps++;
    } catch (e) { log(`scores: DAMM price ${x.mint}: ${(e as Error).message}`); }
  }
  if (plan.hourly) lastDammBucket = bucket;
  return snaps;
}
