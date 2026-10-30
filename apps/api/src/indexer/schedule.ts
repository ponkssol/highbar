/**
 * Adaptive per-pool polling for the RPC indexer (poller.ts). Pure: no RPC, no DB, no timers; `now` is always passed in.
 *
 * Every tick (INDEX_INTERVAL_MS) the poller still scans each config once with getPoolsByConfig (one getProgramAccounts per
 * config, flat cost whatever the pool count) and keeps updating every token row from that scan. Only the per-pool
 * getSignaturesForAddress + getTransaction work is gated here:
 *  - any change of a pool account between two scans (swap, fee claim, migration...) = on-chain activity: poll it now and keep
 *    it hot. This is a free activity trigger, so a burst on an idle pool is caught on the next tick, not after its backoff;
 *  - hot pools (activity in the last INDEXER_ACTIVE_WINDOW_MIN, or created in the last INDEXER_NEW_POOL_HOT_MIN) poll every tick;
 *  - idle pools back off 2x per empty poll up to INDEXER_IDLE_MAX_MS (safety-net sweep for anything the trigger cannot see,
 *    e.g. failed txs, which do not change the pool account);
 *  - migrated pools (no activity for a whole active window) drop to INDEXER_MIGRATED_SWEEP_MS (0 = never again);
 *  - a pool with unprocessed signatures left (backlog) polls again on the next tick.
 * Nothing is lost by polling less often: indexTrades pages every signature newer than the pool cursor (`until`).
 */
export interface PollConfig {
  adaptive: boolean;
  baseMs: number;
  activeWindowMs: number;
  newPoolHotMs: number;
  idleMaxMs: number;
  migratedMs: number;
}

const num = (v: string | undefined, d: number, min = 0) => {
  if (v === undefined || v.trim() === "") return d;
  const n = Number(v);
  return Number.isFinite(n) && n >= min ? n : d;
};

export function pollConfig(env: Record<string, string | undefined> = process.env): PollConfig {
  const baseMs = num(env.INDEX_INTERVAL_MS, 30_000, 1_000);
  const off = (env.INDEXER_ADAPTIVE ?? "").trim().toLowerCase();
  return {
    adaptive: !(off === "0" || off === "false" || off === "off"),
    baseMs,
    activeWindowMs: num(env.INDEXER_ACTIVE_WINDOW_MIN, 15) * 60_000,
    newPoolHotMs: num(env.INDEXER_NEW_POOL_HOT_MIN, 10) * 60_000,
    idleMaxMs: Math.max(baseMs, num(env.INDEXER_IDLE_MAX_MS, 600_000)),
    migratedMs: num(env.INDEXER_MIGRATED_SWEEP_MS, 3_600_000),
  };
}

/** Idle backoff after `idleStreak` consecutive empty polls: base, 2x base, 4x base ... capped at idleMaxMs. */
export function idleDelay(idleStreak: number, cfg: Pick<PollConfig, "baseMs" | "idleMaxMs">): number {
  return Math.min(cfg.idleMaxMs, cfg.baseMs * 2 ** Math.max(0, Math.min(idleStreak, 30)));
}

export type PoolClass = "new" | "active" | "idle" | "migrated";
export interface PoolView { createdAt: number; isMigrated: boolean; fingerprint: string }
interface PoolState { nextAt: number; idleStreak: number; lastActivityAt: number; fingerprint: string; backlog: boolean }

export function classify(v: Pick<PoolView, "createdAt" | "isMigrated">, lastActivityAt: number, now: number, cfg: PollConfig): PoolClass {
  if (lastActivityAt > 0 && now - lastActivityAt < cfg.activeWindowMs) return "active"; // also right after migrating (late txs)
  if (v.isMigrated) return "migrated";
  if (v.createdAt > 0 && now - v.createdAt < cfg.newPoolHotMs) return "new";
  return "idle";
}

/** Stable fingerprint of a decoded pool account (BN / PublicKey serialize through their toJSON). */
export function poolFingerprint(account: unknown): string {
  return JSON.stringify(account, (_k, v) => (typeof v === "bigint" ? v.toString() : v));
}

export class PollScheduler {
  private pools = new Map<string, PoolState>();
  constructor(readonly cfg: PollConfig) {}

  /** Called every tick with the pool's fresh on-chain state from the config scan: poll its signatures now? */
  due(pool: string, v: PoolView, now: number): boolean {
    if (!this.cfg.adaptive) return true;
    const s = this.pools.get(pool);
    if (!s) { // first sight in this process (startup or a new pool): poll once, like the legacy poller
      this.pools.set(pool, { nextAt: 0, idleStreak: 0, lastActivityAt: 0, fingerprint: v.fingerprint, backlog: false });
      return true;
    }
    if (s.fingerprint !== v.fingerprint) this.touch(s, now, v.fingerprint);
    return s.backlog || now >= s.nextAt;
  }

  /** After polling `pool`: `newSigs` = signatures found newer than the cursor (landed or failed), `backlog` = some left unprocessed. */
  record(pool: string, v: PoolView, r: { newSigs: number; backlog: boolean }, now: number) {
    if (!this.cfg.adaptive) return;
    let s = this.pools.get(pool);
    if (!s) { s = { nextAt: 0, idleStreak: 0, lastActivityAt: 0, fingerprint: v.fingerprint, backlog: false }; this.pools.set(pool, s); }
    s.backlog = r.backlog;
    if (r.newSigs > 0) { s.lastActivityAt = now; s.idleStreak = 0; }
    const c = classify(v, s.lastActivityAt, now, this.cfg);
    if (c === "active" || c === "new") { s.idleStreak = 0; s.nextAt = now + this.cfg.baseMs; }
    else if (c === "migrated") s.nextAt = this.cfg.migratedMs > 0 ? now + this.cfg.migratedMs : Number.POSITIVE_INFINITY;
    else { s.idleStreak = r.newSigs > 0 ? 0 : s.idleStreak + 1; s.nextAt = now + idleDelay(s.idleStreak, this.cfg); }
  }

  /** External activity signal (e.g. a future WebSocket trigger): poll on the next tick and keep the pool hot. */
  markHot(pool: string, now: number) { const s = this.pools.get(pool); if (s) this.touch(s, now, s.fingerprint); }

  /** Counts per class (for the tick log). */
  stats(views: Map<string, PoolView>, now: number): Record<PoolClass, number> {
    const out: Record<PoolClass, number> = { new: 0, active: 0, idle: 0, migrated: 0 };
    for (const [pool, v] of views) out[classify(v, this.pools.get(pool)?.lastActivityAt ?? 0, now, this.cfg)]++;
    return out;
  }

  /** test / debug view */
  state(pool: string) { const s = this.pools.get(pool); return s ? { ...s } : undefined; }

  private touch(s: PoolState, now: number, fingerprint: string) {
    s.fingerprint = fingerprint; s.lastActivityAt = now; s.idleStreak = 0; s.nextAt = 0;
  }
}

/** One getSignaturesForAddress page (newest first), `before` / `until` exclusive. */
export type SigPageFetch<T> = (o: { limit: number; until?: string; before?: string }) => Promise<T[]>;

/**
 * Every signature newer than `until` (newest first), paged backwards with `before`. getSignaturesForAddress with only
 * `until` returns at most `limit` of the NEWEST signatures, so a burst bigger than one page used to be skipped for good once
 * the cursor moved to the newest one. complete = false when maxPages ran out before reaching `until` (a real gap: logged).
 */
export async function collectSignatures<T extends { signature: string }>(fetch: SigPageFetch<T>, until: string | undefined, pageSize: number, maxPages: number) {
  const out: T[] = [];
  let before: string | undefined;
  for (let p = 0; p < maxPages; p++) {
    const page = await fetch({ limit: pageSize, until, ...(before ? { before } : {}) });
    out.push(...page);
    if (page.length < pageSize) return { sigs: out, complete: true, pages: p + 1 };
    before = page[page.length - 1].signature;
  }
  return { sigs: out, complete: false, pages: maxPages };
}
