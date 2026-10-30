/**
 * GET /tokens/:mint/pending (routes/pending.ts): is an address that is not in the db yet a real, freshly launched token of ours?
 * The token page asks this instead of returning a 404, so a fresh mint shows the Indexing state on shared links, refreshes and
 * other users' visits too, not only on the launch redirect (?new=1).
 *  1. in the db (mint or pool)                     -> indexed   (no RPC)
 *  2. cached answer for this mint                  -> as cached (no RPC): unknown for PENDING_UNKNOWN_TTL_MS (10 s), pending for PENDING_TTL_MS (5 s)
 *  3. otherwise ONE getMultipleAccounts over the DBC pool PDA of (config, mint, WSOL) for every config in tierConfigs()
 *     (no tx history scan): an account owned by the DBC program at one of those PDAs -> pending (+ fast index of that pool), else unknown.
 * The answer holds only the status and the pool address. Nothing from the client is trusted except the address itself: name, symbol
 * and uri are read from chain by the indexer (indexPool), never from this request.
 * RPC budget: concurrent lookups for one mint share one call; per client IP PENDING_RPC_PER_IP_PER_MIN (20) and process-wide
 * PENDING_RPC_PER_MIN (120) lookups that reach the RPC per minute; over either cap -> rate_limited (nothing cached, no RPC).
 * Pure (deps injected, `now` injectable) so it is unit-tested with PGlite and a fake RPC.
 */
import { PublicKey } from "@solana/web3.js";
import { deriveDbcPoolAddress, DYNAMIC_BONDING_CURVE_PROGRAM_ID } from "@meteora-ag/dynamic-bonding-curve-sdk";
import { WindowLimiter } from "../security/rateLimit.js";

export const WSOL_MINT = new PublicKey("So11111111111111111111111111111111111111112");
export const DBC_PROGRAM_ID = new PublicKey(DYNAMIC_BONDING_CURVE_PROGRAM_ID);

export type PendingStatus = "indexed" | "pending" | "unknown";
export interface PendingResult { status: PendingStatus; pool?: string }
export type PendingAnswer = PendingResult | { status: "rate_limited"; retryAfterMs: number } | { status: "error" };
export interface FoundPool { pool: string; config: string }
export interface PendingConfig { unknownTtlMs: number; pendingTtlMs: number; perIpPerMin: number; globalPerMin: number; memory: number }

const int = (v: string | undefined, d: number, min: number) => {
  const n = Math.floor(Number(v));
  return v !== undefined && v.trim() !== "" && Number.isFinite(n) && n >= min ? n : d;
};
export function pendingConfig(env: Record<string, string | undefined> = process.env): PendingConfig {
  return {
    unknownTtlMs: int(env.PENDING_UNKNOWN_TTL_MS, 10_000, 1000),
    pendingTtlMs: int(env.PENDING_TTL_MS, 5000, 500),
    perIpPerMin: int(env.PENDING_RPC_PER_IP_PER_MIN, 20, 1),
    globalPerMin: int(env.PENDING_RPC_PER_MIN, 120, 1),
    memory: 10_000,
  };
}

export interface AccountLite { owner: PublicKey; data: Uint8Array }
export interface PendingDeps {
  /** db only: a token row with this mint (or pool) exists */
  tokenExists(mint: string): Promise<boolean>;
  /** our DBC configs (poller.ts tierConfigs) */
  configs(): { address: string }[];
  /** ONE getMultipleAccountsInfo call, results in key order (null = no account) */
  getMultipleAccounts(keys: PublicKey[]): Promise<(AccountLite | null)[]>;
  /** fire-and-forget fast index of a found pool (fastIndexer.kick: dedupe per mint, FAST_INDEX caps); must not throw */
  kick(mint: string, found: FoundPool): void;
}

/** The DBC pool PDA of (config, mint, WSOL) for each distinct config. */
export function candidatePools(mint: string, configs: { address: string }[]): FoundPool[] {
  const base = new PublicKey(mint), seen = new Set<string>(), out: FoundPool[] = [];
  for (const c of configs) {
    if (seen.has(c.address)) continue;
    seen.add(c.address);
    out.push({ pool: deriveDbcPoolAddress(WSOL_MINT, base, new PublicKey(c.address)).toBase58(), config: c.address });
  }
  return out;
}

/** First candidate whose account exists and is owned by the DBC program (only the program can create an account at its PDA). */
export function matchPool(cands: FoundPool[], accounts: (AccountLite | null)[], program: PublicKey = DBC_PROGRAM_ID): FoundPool | null {
  for (const [i, c] of cands.entries()) {
    const a = accounts[i];
    if (a && a.owner.equals(program) && a.data.length >= 8) return c;
  }
  return null;
}

/** SELECT against the tokens table (pg Pool / PoolClient or PGlite). */
export const tokenExistsSql = (q: { query: (sql: string, args: unknown[]) => Promise<{ rows: unknown[] }> }) => async (mint: string) =>
  (await q.query("SELECT 1 FROM tokens WHERE mint = $1 OR pool = $1 LIMIT 1", [mint])).rows.length > 0;

export class PendingLookup {
  private cache = new Map<string, { at: number; r: PendingResult }>(); // insertion order = oldest first (bounded by cfg.memory)
  private inflight = new Map<string, Promise<PendingAnswer>>();
  private perIp: WindowLimiter;
  private global: WindowLimiter;
  /** getMultipleAccounts calls made (tests / logs) */
  rpcCalls = 0;
  constructor(readonly cfg: PendingConfig, private deps: PendingDeps, private now: () => number = Date.now) {
    this.perIp = new WindowLimiter(cfg.perIpPerMin, 60_000, now);
    this.global = new WindowLimiter(cfg.globalPerMin, 60_000, now);
  }

  /** `ip` null = the web server itself without a visitor IP (only the global cap applies). Never rejects. */
  async lookup(mint: string, ip: string | null): Promise<PendingAnswer> {
    try {
      if (await this.deps.tokenExists(mint)) { this.cache.delete(mint); return { status: "indexed" }; }
    } catch { return { status: "error" }; }
    const hit = this.cache.get(mint);
    if (hit && this.now() - hit.at < (hit.r.status === "pending" ? this.cfg.pendingTtlMs : this.cfg.unknownTtlMs)) return hit.r;
    const running = this.inflight.get(mint);
    if (running) return running;
    const wait = (ip !== null ? this.perIp.take(ip) : 0) || this.global.take("*");
    if (wait) return { status: "rate_limited", retryAfterMs: wait };
    const p = this.probe(mint).finally(() => this.inflight.delete(mint));
    this.inflight.set(mint, p);
    return p;
  }

  private async probe(mint: string): Promise<PendingAnswer> {
    let cands: FoundPool[];
    try { cands = candidatePools(mint, this.deps.configs()); } catch { return { status: "error" }; }
    let found: FoundPool | null = null;
    if (cands.length) {
      this.rpcCalls++;
      let accounts: (AccountLite | null)[];
      try { accounts = await this.deps.getMultipleAccounts(cands.map((c) => new PublicKey(c.pool))); }
      catch { return { status: "error" }; } // RPC trouble is not "unknown": nothing cached, the caller treats it as transient
      found = matchPool(cands, accounts);
    }
    const r: PendingResult = found ? { status: "pending", pool: found.pool } : { status: "unknown" };
    this.remember(mint, r);
    if (found) { try { this.deps.kick(mint, found); } catch { /* the tick indexes it anyway */ } }
    return r;
  }

  private remember(mint: string, r: PendingResult) {
    this.cache.delete(mint);
    this.cache.set(mint, { at: this.now(), r });
    if (this.cache.size > this.cfg.memory) this.cache.delete(this.cache.keys().next().value as string);
  }
}
