/** Official ecosystem token ($HIGHER). One resolver for every $HIGHER consumer (buyback, holder tiers / perks, fee share,
 *  Max tier gate, /stats, /burn, /bar, the "Official" badge):
 *    1. BAR_MINT env, when set (manual override, wins),
 *    2. otherwise the official_token row (migration 0006): an admin override, or the FIRST launch by OFFICIAL_TOKEN_CREATOR
 *       whose symbol is OFFICIAL_TOKEN_SYMBOL (case-insensitive), recorded once by the indexer,
 *    3. otherwise null: not launched yet, every perk stays off.
 *  The row only changes through the ADMIN_TOKEN endpoints (POST / DELETE /admin/official-token). */
import { PublicKey } from "@solana/web3.js";
import { db } from "../db/pool.js";

export const OFFICIAL_SYMBOL_DEFAULT = "HIGHER";
export type OfficialSource = "env" | "override" | "detected";

export interface OfficialConfig { creator: string | null; symbol: string; envMint: string | null }
export interface OfficialRow { mint: string; symbol: string; creator: string | null; pool: string | null; source: "detected" | "override"; launchedAt: number | null; recordedAt: number }
export interface Official { mint: string | null; source: OfficialSource | null; symbol: string; creator: string | null; pool: string | null; launchedAt: number | null }
export interface LaunchCandidate { mint: string; pool?: string | null; creator: string; symbol: string; createdAt: number }

/** Storage for the single official_token row (Postgres in the app, in-memory in tests). */
export interface OfficialRepo {
  get(): Promise<OfficialRow | null>;
  /** Insert only when no row exists; true when this call wrote it. */
  insertIfAbsent(r: OfficialRow): Promise<boolean>;
  set(r: OfficialRow): Promise<void>;
  clear(): Promise<boolean>;
}

const pk = (v?: string | null) => { const s = v?.trim(); if (!s) return null; try { return new PublicKey(s).toBase58(); } catch { return null; } };

export function officialConfig(env: Record<string, string | undefined> = process.env): OfficialConfig {
  return { creator: pk(env.OFFICIAL_TOKEN_CREATOR), symbol: normSymbol(env.OFFICIAL_TOKEN_SYMBOL || OFFICIAL_SYMBOL_DEFAULT) || OFFICIAL_SYMBOL_DEFAULT, envMint: env.BAR_MINT?.trim() || null };
}

/** "$higher " -> "HIGHER" (NFKC folds full-width / compatibility letters; invisible chars are stripped). */
export function normSymbol(s: string | null | undefined): string {
  return String(s ?? "").normalize("NFKC").replace(/[\s\u200b-\u200f\u202a-\u202e\u2060-\u2064\ufeff]/g, "").replace(/^\$+/, "").toUpperCase();
}
export const isOfficialSymbol = (symbol: string | null | undefined, cfg: OfficialConfig) => normSymbol(symbol) === cfg.symbol;
export const isOfficialCandidate = (t: Pick<LaunchCandidate, "creator" | "symbol">, cfg: OfficialConfig) => !!cfg.creator && t.creator === cfg.creator && isOfficialSymbol(t.symbol, cfg);

/** Impersonation guard for POST /tx/launch: the official symbol is reserved for OFFICIAL_TOKEN_CREATOR (403 message, null = allowed). */
export function impersonationBlock(symbol: string, creator: string, cfg: OfficialConfig): string | null {
  if (!isOfficialSymbol(symbol, cfg)) return null;
  if (cfg.creator && creator === cfg.creator) return null;
  return `The symbol ${cfg.symbol} is reserved for the official highbar ecosystem token and can only be launched by the official dev wallet. Pick another symbol.`;
}

/** Pure precedence: BAR_MINT env > stored row (override or detected) > not launched. */
export function resolveOfficial(cfg: OfficialConfig, row: OfficialRow | null): Official {
  if (cfg.envMint) return { mint: cfg.envMint, source: "env", symbol: cfg.symbol, creator: cfg.creator, pool: row?.mint === cfg.envMint ? row.pool : null, launchedAt: row?.mint === cfg.envMint ? row.launchedAt : null };
  if (row) return { mint: row.mint, source: row.source, symbol: normSymbol(row.symbol) || cfg.symbol, creator: row.creator, pool: row.pool, launchedAt: row.launchedAt };
  return { mint: null, source: null, symbol: cfg.symbol, creator: cfg.creator, pool: null, launchedAt: null };
}

/** Indexer hook: record the FIRST official launch (earliest createdAt, then mint) among `launches`. Idempotent: once a row
 *  exists (detected or admin override) nothing is written again. Returns the row written by this call, else null. */
export async function detectOfficial(launches: LaunchCandidate[], cfg: OfficialConfig, repo: OfficialRepo, now = Date.now()): Promise<OfficialRow | null> {
  if (!cfg.creator) return null;
  const first = launches.filter((t) => isOfficialCandidate(t, cfg)).sort((a, b) => (a.createdAt || Infinity) - (b.createdAt || Infinity) || a.mint.localeCompare(b.mint))[0];
  if (!first || (await repo.get())) return null;
  const row: OfficialRow = { mint: first.mint, symbol: normSymbol(first.symbol), creator: first.creator, pool: first.pool ?? null, source: "detected", launchedAt: first.createdAt || null, recordedAt: now };
  return (await repo.insertIfAbsent(row)) ? row : null;
}

const hasTable = async () => !!(await db.query("SELECT to_regclass('public.official_token') AS t")).rows[0].t;
type DbRow = { mint: string; symbol: string; creator: string | null; pool: string | null; source: "detected" | "override"; launched_at: number | null; recorded_at: number };
const fromDb = (r: DbRow): OfficialRow => ({ mint: r.mint, symbol: r.symbol, creator: r.creator, pool: r.pool, source: r.source, launchedAt: r.launched_at == null ? null : Number(r.launched_at), recordedAt: Number(r.recorded_at) });
const vals = (r: OfficialRow) => [r.mint, r.symbol, r.creator, r.pool, r.source, r.launchedAt, r.recordedAt];

export const pgOfficialRepo: OfficialRepo = {
  async get() {
    if (!(await hasTable())) return null; // jobs started before migration 0006
    const r = (await db.query<DbRow>("SELECT mint, symbol, creator, pool, source, launched_at, recorded_at FROM official_token WHERE id")).rows[0];
    return r ? fromDb(r) : null;
  },
  async insertIfAbsent(r) {
    return !!(await db.query("INSERT INTO official_token (id, mint, symbol, creator, pool, source, launched_at, recorded_at) VALUES (TRUE,$1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING", vals(r))).rowCount;
  },
  async set(r) {
    await db.query(`INSERT INTO official_token (id, mint, symbol, creator, pool, source, launched_at, recorded_at) VALUES (TRUE,$1,$2,$3,$4,$5,$6,$7)
      ON CONFLICT (id) DO UPDATE SET mint=EXCLUDED.mint, symbol=EXCLUDED.symbol, creator=EXCLUDED.creator, pool=EXCLUDED.pool, source=EXCLUDED.source,
        launched_at=EXCLUDED.launched_at, recorded_at=EXCLUDED.recorded_at`, vals(r));
  },
  async clear() { return !!(await db.query("DELETE FROM official_token WHERE id")).rowCount; },
};

/** In-memory repo (tests, scripts). */
export function memoryOfficialRepo(init: OfficialRow | null = null): OfficialRepo {
  let row = init;
  return {
    async get() { return row; },
    async insertIfAbsent(r) { if (row) return false; row = r; return true; },
    async set(r) { row = r; },
    async clear() { const had = !!row; row = null; return had; },
  };
}

// ---- process-wide resolved value (sync reads for bar.mint / jobs.barMint; refreshed by the API indexer tick, admin calls and job start) ----
let current: Official = resolveOfficial(officialConfig(), null);
const listeners = new Set<(o: Official) => void>();
export const official = (): Official => current;
export const officialMint = (): string | null => current.mint;
export const onOfficialChange = (fn: (o: Official) => void) => { listeners.add(fn); return () => listeners.delete(fn); };

export async function refreshOfficial(repo: OfficialRepo = pgOfficialRepo, env: Record<string, string | undefined> = process.env): Promise<Official> {
  const prev = current.mint;
  current = resolveOfficial(officialConfig(env), await repo.get());
  if (current.mint !== prev) for (const fn of listeners) fn(current);
  return current;
}

/** Admin override (POST /admin/official-token): pin `mint` as the official token. */
export async function overrideOfficial(o: { mint: string; symbol?: string; creator?: string | null; pool?: string | null; launchedAt?: number | null }, repo: OfficialRepo = pgOfficialRepo, env: Record<string, string | undefined> = process.env) {
  const mint = pk(o.mint);
  if (!mint) throw new Error("mint must be a valid Solana address");
  const cfg = officialConfig(env);
  await repo.set({ mint, symbol: normSymbol(o.symbol) || cfg.symbol, creator: pk(o.creator) ?? null, pool: pk(o.pool) ?? null, source: "override", launchedAt: o.launchedAt ?? null, recordedAt: Date.now() });
  return refreshOfficial(repo, env);
}
/** Admin clear (DELETE /admin/official-token): drop the row; the indexer then re-detects the first official launch (if any). */
export async function clearOfficial(repo: OfficialRepo = pgOfficialRepo, env: Record<string, string | undefined> = process.env) {
  const removed = await repo.clear();
  return { removed, official: await refreshOfficial(repo, env) };
}
