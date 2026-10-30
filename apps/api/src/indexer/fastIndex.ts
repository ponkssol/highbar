/**
 * Gate for the POST /mint/confirm fast path (poller.ts indexNewMint): a freshly launched token is indexed within ~1-3 s instead
 * of waiting for the next indexer tick. Pure (no RPC / DB of its own; `now` injectable) so it is unit-tested.
 *  - fire-and-forget: the route never awaits it, errors are swallowed (the tick still indexes the token within INDEX_INTERVAL_MS);
 *  - concurrent calls for one mint share one promise; each mint gets at most one RPC attempt per process (bounded memory);
 *  - only a vanity reservation of ours, or a request carrying the launch signature, may spend RPC; the run itself then verifies the
 *    DBC init event on-chain and that its config is ours (tierConfigs), so arbitrary mints cost at most one getTransaction;
 *  - mint-only path (GET /tokens/:mint/pending, indexer/pending.ts): `found` = a DBC pool PDA of (our config, mint, WSOL) that
 *    exists on-chain; the run skips the tx lookup and reads that pool directly (getPool still checks its base mint);
 *  - global caps: FAST_INDEX_PER_MIN runs started per minute (default 30), FAST_INDEX_MAX_CONCURRENT at once (default 4);
 *  - FAST_INDEX=0 turns it off.
 */
import type { DbcEvent } from "./decode.js";
import type { FoundPool } from "./pending.js";

export type FastStatus = "indexed" | "exists" | "duplicate" | "ineligible" | "rate_limited" | "disabled" | "not_found" | "rejected" | "failed";
export interface FastResult { status: FastStatus; detail?: string }
export interface FastIndexConfig { enabled: boolean; perMin: number; maxConcurrent: number; memory: number }
/** signature = the launch tx, reserved = one of our vanity reservations, found = our pool PDA seen on-chain (pending lookup) */
export interface FastOpts { signature?: string; reserved?: boolean; found?: FoundPool }

const int = (v: string | undefined, d: number, min: number) => {
  const n = Math.floor(Number(v));
  return v !== undefined && v.trim() !== "" && Number.isFinite(n) && n >= min ? n : d;
};

export function fastIndexConfig(env: Record<string, string | undefined> = process.env): FastIndexConfig {
  const off = (env.FAST_INDEX ?? "").trim().toLowerCase();
  return {
    enabled: !(off === "0" || off === "false" || off === "off"),
    perMin: int(env.FAST_INDEX_PER_MIN, 30, 1),
    maxConcurrent: int(env.FAST_INDEX_MAX_CONCURRENT, 4, 1),
    memory: 10_000,
  };
}

/** A base58 transaction signature (64 bytes = 86-88 chars; shorter only with leading zero bytes), else undefined (ignored, never a 400). */
export function optionalSignature(v: unknown): string | undefined {
  return typeof v === "string" && /^[1-9A-HJ-NP-Za-km-z]{64,88}$/.test(v) ? v : undefined;
}

/** The DBC init event creating `mint` from one of `configs` (the launch tx's own event, never client input), else null. */
export function initForMint(events: DbcEvent[], mint: string, configs: { address: string }[]): { pool: string; config: string } | null {
  const ours = new Set(configs.map((c) => c.address));
  for (const ev of events) if (ev.kind === "init" && ev.mint === mint && ours.has(ev.config)) return { pool: ev.pool, config: ev.config };
  return null;
}

export interface FastDeps {
  /** db only: the token row exists already (the tick got there first) */
  tokenExists(mint: string): Promise<boolean>;
  /** the RPC part (poller.ts indexNewMint) */
  run(mint: string, signature: string | undefined, found?: FoundPool): Promise<FastResult>;
}

export class FastIndexer {
  private inflight = new Map<string, Promise<FastResult>>();
  private attempted = new Set<string>(); // insertion order = oldest first (bounded by cfg.memory)
  private starts: number[] = [];
  private active = 0;
  constructor(readonly cfg: FastIndexConfig, private deps: FastDeps, private now: () => number = Date.now) {}

  /** Never rejects. Concurrent calls for the same mint get the same promise. */
  request(mint: string, o: FastOpts = {}): Promise<FastResult> {
    const hit = this.inflight.get(mint);
    if (hit) return hit;
    const p = this.handle(mint, o).catch((): FastResult => ({ status: "failed" })).finally(() => this.inflight.delete(mint));
    this.inflight.set(mint, p);
    return p;
  }

  /** Fire-and-forget for the route: starts on the next turn of the event loop, so it cannot delay the response. */
  kick(mint: string, o: FastOpts = {}, log?: (m: string) => void) {
    setImmediate(() => {
      const t0 = this.now();
      void this.request(mint, o).then((r) => {
        if (log && r.status !== "duplicate" && r.status !== "ineligible") log(`[fast-index] ${mint}: ${r.status}${r.detail ? ` (${r.detail})` : ""} in ${this.now() - t0} ms`);
      });
    });
  }

  private async handle(mint: string, o: FastOpts): Promise<FastResult> {
    if (!this.cfg.enabled) return { status: "disabled" };
    if (this.attempted.has(mint)) return { status: "duplicate" };
    if (!o.signature && !o.reserved && !o.found) return { status: "ineligible", detail: "no launch signature, not one of our vanity reservations, no pool of ours on-chain" };
    if (await this.deps.tokenExists(mint)) { this.remember(mint); return { status: "exists" }; }
    const t = this.now();
    this.starts = this.starts.filter((x) => t - x < 60_000);
    if (this.starts.length >= this.cfg.perMin || this.active >= this.cfg.maxConcurrent) return { status: "rate_limited" }; // not remembered: a later confirm may retry
    this.starts.push(t);
    this.remember(mint);
    this.active++;
    try { return await this.deps.run(mint, o.signature, o.found); }
    finally { this.active--; }
  }

  private remember(mint: string) {
    this.attempted.add(mint);
    if (this.attempted.size > this.cfg.memory) this.attempted.delete(this.attempted.values().next().value as string);
  }
}
