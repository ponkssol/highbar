// ---- leaderboard rows: the shapes GET /leaderboard/:kind returns (apps/api routes/pages.ts) and the web normalizer ----
// No value imports from ./index.js: index.ts re-exports this module (a value import would hit the TDZ at load time).
import type { TierId } from "./index.js";

export const LEADERBOARD_KINDS = ["tokens", "scores", "creators", "traders", "migrations", "survivors"] as const;
export type LeaderboardKind = (typeof LEADERBOARD_KINDS)[number];
export type LeaderboardWindow = "24h" | "7d" | "week" | "all";

export interface LbScoreBreakdown { tier: number; antiSniper: number; devLock: number; spread: number; holders: number; top10Pct: number; label?: string; lockedPct?: number; lockDaysLeft?: number }
export interface LbTokenBase {
  mint: string; name: string; symbol: string; tier: TierId; mcapUsd: number; progress: number; isMigrated: boolean;
  score: number | null; devLocked: boolean; unlockAt: number | null; official: boolean;
}
export interface LbTokenRow extends LbTokenBase { volumeSol: number; trades: number; volume24hSol?: number }
export interface LbScoreRow extends LbTokenBase { label: string | null; volumeSol: number; breakdown: LbScoreBreakdown | null }
export interface LbMigrationRow extends LbTokenBase { migratedAt: number; createdAt: number; timeToMigrateMs: number; raisedSol: number; volumeSol: number }
export interface LbSurvivorRow extends LbTokenBase {
  migratedAt: number; mcapAtMigrationSol?: number; daysSinceMigration: number; survivedDays: number; ratioNow: number | null;
  nowMcapSol?: number | null; nowMcapUsd: number | null; alive: boolean | null; minRatio: number;
}
export interface LbCreatorRow { creator: string; tokens: number; graduated: number; volumeSol: number; feesEarnedSol: number; avgScore: number | null }
export interface LbTraderRow { wallet: string; volumeSol: number; trades: number; buys: number; sells: number; lastTs: number }
export interface LeaderboardRows {
  tokens: LbTokenRow[]; scores: LbScoreRow[]; creators: LbCreatorRow[]; traders: LbTraderRow[]; migrations: LbMigrationRow[]; survivors: LbSurvivorRow[];
}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const num = (v: unknown, d = 0): number => (typeof v === "number" && Number.isFinite(v) ? v : d);
const numOrNull = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const str = (v: unknown, d = ""): string => (typeof v === "string" ? v : d);
const bool = (v: unknown): boolean => v === true;
const boolOrNull = (v: unknown): boolean | null => (typeof v === "boolean" ? v : null);
const TIER_IDS: readonly TierId[] = ["standard", "higher", "max"];
const tier = (v: unknown): TierId => (TIER_IDS.includes(v as TierId) ? (v as TierId) : "standard");

function base(o: Obj): LbTokenBase | null {
  const mint = str(o.mint);
  if (!mint) return null;
  return {
    mint, name: str(o.name), symbol: str(o.symbol), tier: tier(o.tier), mcapUsd: num(o.mcapUsd), progress: num(o.progress),
    isMigrated: bool(o.isMigrated), score: numOrNull(o.score), devLocked: bool(o.devLocked), unlockAt: numOrNull(o.unlockAt), official: bool(o.official),
  };
}
function breakdown(v: unknown): LbScoreBreakdown | null {
  if (!isObj(v)) return null;
  return {
    tier: num(v.tier), antiSniper: num(v.antiSniper), devLock: num(v.devLock), spread: num(v.spread), holders: num(v.holders), top10Pct: num(v.top10Pct),
    label: typeof v.label === "string" ? v.label : undefined, lockedPct: numOrNull(v.lockedPct) ?? undefined, lockDaysLeft: numOrNull(v.lockDaysLeft) ?? undefined,
  };
}

const ROW: { [K in LeaderboardKind]: (o: Obj) => LeaderboardRows[K][number] | null } = {
  tokens: (o) => { const b = base(o); return b && { ...b, volumeSol: num(o.volumeSol), trades: num(o.trades), volume24hSol: num(o.volume24hSol) }; },
  scores: (o) => { const b = base(o); const bd = breakdown(o.breakdown); return b && { ...b, label: typeof o.label === "string" ? o.label : bd?.label ?? null, volumeSol: num(o.volumeSol), breakdown: bd }; },
  migrations: (o) => {
    const b = base(o); if (!b) return null;
    const migratedAt = num(o.migratedAt), createdAt = num(o.createdAt);
    return { ...b, migratedAt, createdAt, timeToMigrateMs: num(o.timeToMigrateMs, Math.max(0, migratedAt - createdAt)), raisedSol: num(o.raisedSol), volumeSol: num(o.volumeSol) };
  },
  survivors: (o) => {
    const b = base(o); return b && {
      ...b, migratedAt: num(o.migratedAt), mcapAtMigrationSol: num(o.mcapAtMigrationSol), daysSinceMigration: num(o.daysSinceMigration), survivedDays: num(o.survivedDays),
      ratioNow: numOrNull(o.ratioNow), nowMcapSol: numOrNull(o.nowMcapSol), nowMcapUsd: numOrNull(o.nowMcapUsd), alive: boolOrNull(o.alive), minRatio: num(o.minRatio),
    };
  },
  creators: (o) => { const creator = str(o.creator); return creator ? { creator, tokens: num(o.tokens), graduated: num(o.graduated), volumeSol: num(o.volumeSol), feesEarnedSol: num(o.feesEarnedSol), avgScore: numOrNull(o.avgScore) } : null; },
  traders: (o) => { const wallet = str(o.wallet); return wallet ? { wallet, volumeSol: num(o.volumeSol), trades: num(o.trades), buys: num(o.buys), sells: num(o.sells), lastTs: num(o.lastTs) } : null; },
};

/** Coerce any GET /leaderboard/:kind payload (error body, null, wrong shape, partial rows) into well-formed rows.
 *  Non-array payloads -> []; rows without their key (mint / creator / wallet) are dropped; missing fields get safe defaults. */
export function normalizeLeaderboard<K extends LeaderboardKind>(kind: K, payload: unknown): LeaderboardRows[K] {
  if (!Array.isArray(payload) || !(kind in ROW)) return [] as unknown as LeaderboardRows[K];
  const f = ROW[kind] as (o: Obj) => LeaderboardRows[K][number] | null;
  return payload.flatMap((o) => { if (!isObj(o)) return []; const r = f(o); return r ? [r] : []; }) as LeaderboardRows[K];
}
