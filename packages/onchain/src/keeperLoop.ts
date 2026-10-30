/** Keeper loop timing (pure, no RPC; see keeper.ts and keeperLoop.test.ts).
 *
 *  Interval precedence (read once at startup):
 *    1. `--loop N`           explicit CLI value wins (N seconds)
 *    2. KEEPER_LOOP_SEC      env, used by `--loop` without a value (the Railway start command)
 *    3. 900                  default (15 min)
 *  Without `--loop` the keeper runs a single pass and exits (scripts / tests).
 *
 *  Fast lane: while a pool is close to graduating (progress >= KEEPER_HOT_PCT, default 0.9, and its reserve moved since
 *  the last pass) or a completed curve still waits for a live migration, the next pass runs after KEEPER_HOT_LOOP_SEC
 *  (default 30) instead, so a full curve is migrated within ~30s as before while an idle keeper costs 30x less. */
export interface KeeperLoopConfig { loopSec: number; hotSec: number; hotPct: number }

export const KEEPER_LOOP_SEC_DEFAULT = 900;
export const KEEPER_HOT_LOOP_SEC_DEFAULT = 30;
export const KEEPER_HOT_PCT_DEFAULT = 0.9;

const positive = (v: string | undefined, d: number) => { const n = Number(v); return v !== undefined && v.trim() !== "" && Number.isFinite(n) && n > 0 ? n : d; };

export function keeperLoopConfig(argv: string[] = process.argv, env: Record<string, string | undefined> = process.env): KeeperLoopConfig {
  const i = argv.indexOf("--loop");
  const envSec = positive(env.KEEPER_LOOP_SEC, KEEPER_LOOP_SEC_DEFAULT);
  let loopSec = 0;
  if (i >= 0) { const n = Number(argv[i + 1]); loopSec = argv[i + 1] !== undefined && !argv[i + 1].startsWith("--") && Number.isFinite(n) && n > 0 ? n : envSec; }
  const hotSec = Math.min(positive(env.KEEPER_HOT_LOOP_SEC, KEEPER_HOT_LOOP_SEC_DEFAULT), loopSec || Number.POSITIVE_INFINITY);
  const pct = positive(env.KEEPER_HOT_PCT, KEEPER_HOT_PCT_DEFAULT);
  return { loopSec, hotSec, hotPct: pct > 1 ? 1 : pct };
}

/** Seconds to sleep before the next pass. */
export function nextDelaySec(cfg: KeeperLoopConfig, hot: boolean): number { return hot ? cfg.hotSec : cfg.loopSec; }

/** One pool seen in a keeper pass (amounts in lamports as strings or bigints). */
export interface KeeperPoolView { pool: string; quoteReserve: bigint; threshold: bigint; migrated: boolean }

/** Tracks curve reserves between passes and tells whether the next pass should be fast. */
export class HotTracker {
  private last = new Map<string, bigint>();
  constructor(private readonly hotPct: number) {}
  /** `pendingLive` = completed curves this pass that are still not migrated (live mode error / not yet confirmed). */
  update(pools: KeeperPoolView[], pendingLive: number): boolean {
    let hot = pendingLive > 0;
    const seen = new Set<string>();
    for (const p of pools) {
      seen.add(p.pool);
      if (p.migrated) { this.last.delete(p.pool); continue; }
      const prev = this.last.get(p.pool);
      this.last.set(p.pool, p.quoteReserve);
      if (p.threshold <= 0n) continue;
      const near = p.quoteReserve * 10_000n >= p.threshold * BigInt(Math.round(this.hotPct * 10_000));
      if (near && (prev === undefined || prev !== p.quoteReserve)) hot = true; // close to graduating and still trading
    }
    for (const k of [...this.last.keys()]) if (!seen.has(k)) this.last.delete(k);
    return hot;
  }
}

/** Tiny TTL cache (DBC pool configs are immutable once created): only non-null values are kept. */
export function ttlCache<K, V>(ttlMs: number, now: () => number = Date.now) {
  const m = new Map<K, { at: number; v: V }>();
  return async (key: K, load: () => Promise<V | null>): Promise<V | null> => {
    const hit = m.get(key);
    if (hit && now() - hit.at < ttlMs) return hit.v;
    const v = await load();
    if (v != null) m.set(key, { at: now(), v });
    return v;
  };
}
