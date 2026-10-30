import { NATIVE_MINT } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import { CpAmm, getPriceFromSqrtPrice } from "@meteora-ag/cp-amm-sdk";
import { DAMM_V2_MIGRATION_FEE_ADDRESS, deriveDammV2PoolAddress } from "@meteora-ag/dynamic-bonding-curve-sdk";
import { getClient, getConnection, withRetry } from "@hb/onchain";
import { store } from "../store.js";
import { computeScore, TOTAL_SUPPLY } from "./score.js";
import { scoresStore } from "./scoresStore.js";

const HOUR = 3_600_000;

/** DAMM v2 price (SOL per token) of a graduated token: its pool is the token/WSOL pool with the most liquidity. */
async function dammPrice(mint: string, config: string, known: string | null): Promise<{ pool: string; priceSol: number } | null> {
  const amm = new CpAmm(getConnection());
  let pool = known, state = null as Awaited<ReturnType<CpAmm["fetchPoolState"]>> | null;
  if (!pool) {
    // derive it like the keeper migrated it: DAMM v2 config for the DBC config's migrationFeeOption (or DAMM_V2_CONFIG)
    const cfg = await withRetry(() => getClient().state.getPoolConfig(new PublicKey(config))).catch(() => null);
    const dammConfig = process.env.DAMM_V2_CONFIG ? new PublicKey(process.env.DAMM_V2_CONFIG) : cfg ? DAMM_V2_MIGRATION_FEE_ADDRESS[Number(cfg.migrationFeeOption)] : undefined;
    if (dammConfig) pool = deriveDammV2PoolAddress(dammConfig, new PublicKey(mint), NATIVE_MINT).toBase58();
  }
  if (pool) state = await withRetry(() => amm.fetchPoolState(new PublicKey(pool!))).catch(() => null);
  if (!state) { // fallback: getProgramAccounts by token A mint (often rate-limited on public RPC)
    const found = (await withRetry(() => amm.fetchPoolStatesByTokenAMint(new PublicKey(mint))))
      .filter((p) => p.account.tokenBMint.equals(NATIVE_MINT))
      .sort((a, b) => (b.account.liquidity.gt(a.account.liquidity) ? 1 : -1));
    if (!found.length) return null;
    pool = found[0].publicKey.toBase58(); state = found[0].account;
  }
  return { pool: pool!, priceSol: Number(getPriceFromSqrtPrice(state.sqrtPrice, 6, 9).toString()) };
}

/** Recompute Higher Bar scores + holders for every token and write an hourly price snapshot
 *  (curve price while bonding, DAMM v2 pool price after migration when `rpc`). Off-chain only; sends nothing. */
export async function runScores(log: (m: string) => void = console.log, opts: { rpc?: boolean } = {}) {
  const now = Date.now(), nowSec = Math.floor(now / 1000), bucket = Math.floor(now / HOUR) * HOUR;
  const [tokens, balances, locks, mig] = await Promise.all([store.tokens(), scoresStore.tradeBalances(), scoresStore.activeLocks(nowSec), scoresStore.migrationInfo()]);
  let scored = 0, snaps = 0;
  for (const t of tokens) {
    const lock = locks.get(t.mint) ?? null;
    // dev tokens moved into a lock escrow are no longer in the creator wallet
    const holders = (balances.get(t.mint) ?? [])
      .map((h) => (h.wallet === t.creator && lock ? { ...h, balance: Math.max(0, h.balance - lock.lockedTokens) } : h))
      .filter((h) => h.balance > 1e-6);
    const r = computeScore({ tier: t.tier, antiSniper: t.antiSniper, lock, balances: holders.map((h) => h.balance), nowSec });
    await scoresStore.saveScore(t.mint, r.score, { ...r.breakdown, label: r.label }, holders, now);
    scored++;
    if (!t.isMigrated) { await scoresStore.addSnapshot(t.mint, bucket, t.priceSol, t.mcapSol, "curve"); snaps++; continue; }
    const m = mig.get(t.mint);
    if (m && m.migratedAt == null) await scoresStore.markMigrated(t.mint, now); // legacy rows: the poller stamps new graduations
    if (opts.rpc === false) continue;
    try {
      const p = await dammPrice(t.mint, t.config, m?.dammPool ?? null);
      if (!p) { log(`scores: no DAMM v2 pool found for ${t.mint}`); continue; }
      if (p.pool !== m?.dammPool) await scoresStore.setDammPool(t.mint, p.pool);
      await scoresStore.addSnapshot(t.mint, bucket, p.priceSol, p.priceSol * TOTAL_SUPPLY, "damm"); snaps++;
    } catch (e) { log(`scores: DAMM price ${t.mint}: ${(e as Error).message}`); }
  }
  log(`scores: ${scored} tokens scored, ${snaps} snapshots`);
  return { scored, snapshots: snaps };
}
