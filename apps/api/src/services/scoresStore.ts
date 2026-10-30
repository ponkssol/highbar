import { db, tx, type Q } from "../db/pool.js";
import { HOLDER_MIN_TOKENS, scoreLabel, type ScoreBreakdown } from "./score.js";

/** Net curve balance per (mint, wallet) and the holder rule (score.ts HOLDER_MIN_TOKENS), shared by the job and the live count. */
const NET = "sum(CASE WHEN side = 'buy' THEN tokens ELSE -tokens END)";
const IS_HOLDER = `${NET} > ${HOLDER_MIN_TOKENS}`;

/** Postgres access for scores / holders / snapshots / migration info (tables in db/migrations/0003). */
export const scoresStore = {
  /** Net token balance per (mint, wallet) from indexed curve trades. */
  async tradeBalances(): Promise<Map<string, { wallet: string; balance: number }[]>> {
    const r = await db.query<{ mint: string; wallet: string; balance: number }>(
      `SELECT mint, wallet, ${NET}::float8 AS balance FROM trades GROUP BY mint, wallet HAVING ${IS_HOLDER}`);
    const m = new Map<string, { wallet: string; balance: number }[]>();
    for (const x of r.rows) (m.get(x.mint) ?? m.set(x.mint, []).get(x.mint)!).push({ wallet: x.wallet, balance: x.balance });
    return m;
  },
  /** Active locks per mint (same rule as the dev-lock badge): locked tokens (whole) and the latest cliff. */
  async activeLocks(nowSec: number): Promise<Map<string, { lockedTokens: number; unlockAt: number }>> {
    const r = await db.query<{ mint: string; locked: number; unlock_at: number }>(
      `SELECT mint, (sum(locked::numeric) / 1e6)::float8 AS locked, max(cliff_time)::float8 AS unlock_at FROM lock_escrows
       WHERE NOT cancelled AND locked IS NOT NULL AND locked::numeric > 0 AND end_time > $1 GROUP BY mint`, [nowSec]);
    return new Map(r.rows.map((x) => [x.mint, { lockedTokens: x.locked, unlockAt: x.unlock_at }]));
  },
  async migrationInfo(): Promise<Map<string, { migratedAt: number | null; dammPool: string | null }>> {
    const r = await db.query<{ mint: string; migrated_at: string | null; damm_pool: string | null }>("SELECT mint, migrated_at, damm_pool FROM tokens WHERE is_migrated");
    return new Map(r.rows.map((x) => [x.mint, { migratedAt: x.migrated_at == null ? null : Number(x.migrated_at), dammPool: x.damm_pool }]));
  },
  async markMigrated(mint: string, ts: number) { await db.query("UPDATE tokens SET migrated_at = $2 WHERE mint = $1 AND migrated_at IS NULL", [mint, Math.round(ts)]); },
  async setDammPool(mint: string, pool: string) { await db.query("UPDATE tokens SET damm_pool = $2 WHERE mint = $1", [mint, pool]); },

  async saveScore(mint: string, score: number, breakdown: ScoreBreakdown & { label: string }, holders: { wallet: string; balance: number }[], now: number) {
    await tx(async (c) => {
      await c.query(`INSERT INTO scores (mint, score, breakdown_json, updated_at) VALUES ($1,$2,$3,$4)
        ON CONFLICT (mint) DO UPDATE SET score = EXCLUDED.score, breakdown_json = EXCLUDED.breakdown_json, updated_at = EXCLUDED.updated_at`, [mint, score, JSON.stringify(breakdown), now]);
      await c.query("DELETE FROM holders WHERE mint = $1", [mint]);
      if (holders.length) await c.query("INSERT INTO holders (mint, wallet, balance, updated_at) SELECT $1, w, b, $4 FROM unnest($2::text[], $3::float8[]) AS u(w, b)",
        [mint, holders.map((h) => h.wallet), holders.map((h) => h.balance), now]);
    });
  },
  /** Live holder count per mint from indexed trades (the HOLDER_MIN_TOKENS rule). Mints with no holder are absent. */
  async holderCounts(mints?: string[], q: Q = db): Promise<Map<string, number>> {
    const r = await q.query<{ mint: string; n: number }>(
      `SELECT mint, count(*)::int AS n FROM (SELECT mint, wallet FROM trades ${mints ? "WHERE mint = ANY($1)" : ""} GROUP BY mint, wallet HAVING ${IS_HOLDER}) h GROUP BY mint`,
      mints ? [mints] : []);
    return new Map(r.rows.map((x) => [x.mint, Number(x.n)]));
  },
  /** Stored scores. `holders` (default true) replaces breakdown.holders with the live count, so the Score tab never shows a
   *  count older than the trades (the job runs every SCORES_INTERVAL_MS). Points stay as of updatedAt. */
  async scores(mints?: string[], o: { holders?: boolean; q?: Q } = {}): Promise<Map<string, { score: number; breakdown: ScoreBreakdown & { label: string }; updatedAt: number }>> {
    const q = o.q ?? db;
    const r = await q.query<{ mint: string; score: number; breakdown_json: ScoreBreakdown & { label: string }; updated_at: string }>(
      mints ? "SELECT * FROM scores WHERE mint = ANY($1)" : "SELECT * FROM scores", mints ? [mints] : []);
    const live = o.holders === false || !r.rows.length ? null : await scoresStore.holderCounts(mints, q);
    // label is derived from the score on read, so rows written before a label rename (old brand text) never surface it.
    return new Map(r.rows.map((x) => [x.mint, { score: x.score, updatedAt: Number(x.updated_at),
      breakdown: { ...x.breakdown_json, label: scoreLabel(x.score), ...(live ? { holders: live.get(x.mint) ?? 0 } : {}) } }]));
  },
  async holders(mint: string, limit: number) {
    return (await db.query<{ wallet: string; balance: number }>("SELECT wallet, balance FROM holders WHERE mint = $1 ORDER BY balance DESC, wallet LIMIT $2", [mint, limit])).rows;
  },

  async addSnapshot(mint: string, ts: number, priceSol: number, mcapSol: number, source: "curve" | "damm") {
    if (!(priceSol > 0)) return;
    await db.query(`INSERT INTO token_snapshots (mint, ts, price_sol, mcap_sol, source) VALUES ($1,$2,$3,$4,$5)
      ON CONFLICT (mint, ts) DO UPDATE SET price_sol = EXCLUDED.price_sol, mcap_sol = EXCLUDED.mcap_sol, source = EXCLUDED.source`, [mint, ts, priceSol, mcapSol, source]);
  },
  async dammSnapshots(mints: string[]): Promise<Map<string, { ts: number; mcapSol: number }[]>> {
    if (!mints.length) return new Map();
    const r = await db.query<{ mint: string; ts: string; mcap_sol: number }>("SELECT mint, ts, mcap_sol FROM token_snapshots WHERE source = 'damm' AND mint = ANY($1) ORDER BY ts", [mints]);
    const m = new Map<string, { ts: number; mcapSol: number }[]>();
    for (const x of r.rows) (m.get(x.mint) ?? m.set(x.mint, []).get(x.mint)!).push({ ts: Number(x.ts), mcapSol: x.mcap_sol });
    return m;
  },
};
