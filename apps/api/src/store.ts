import { db, tx, type Q } from "./db/pool.js";

/** Postgres-backed store (tables in db/migrations). Shapes match the former JSON store / API responses. */
export interface Token {
  mint: string; pool: string; config: string; tier: "standard" | "higher" | "max"; antiSniper: boolean;
  creator: string; createdAt: number; quoteReserveSol: number; thresholdSol: number; progress: number;
  isMigrated: boolean; priceSol: number; mcapSol: number; name: string; symbol: string; uri: string;
  volumeSol: number; volume24hSol: number; trades: number; creatorFeesSol: number; feesSol: number; updatedAt: number;
}
/** sig = "<txsig>:<ixIdx>" */
export interface TradeRow { sig: string; pool: string; mint: string; side: "buy" | "sell"; sol: number; tokens: number; feeSol: number; wallet: string; viaUi: boolean; ts: number; /** first buy inside the pool-creation tx (Block 0) */ devBuy?: boolean }
export type ActivityType = "launch" | "burn" | "graduate" | "trade";
export interface Activity { id: string; type: ActivityType; mint: string; symbol: string; ts: number; amount?: number; side?: "buy" | "sell"; wallet?: string; sig?: string }
export interface LockMeta { mint: string; creator: string; cliffTime: number; endTime: number; total: string; locked: string; cancelled: boolean; seenAt: number }

export const splitSig = (s: string) => { const k = s.lastIndexOf(":"); return k > 0 ? { sig: s.slice(0, k), ixIdx: Number(s.slice(k + 1)) || 0 } : { sig: s, ixIdx: 0 }; };

const TOKEN_COLS = `mint, pool, config, tier, anti_sniper AS "antiSniper", creator, created_at AS "createdAt", quote_reserve_sol AS "quoteReserveSol",
  threshold_sol AS "thresholdSol", progress, is_migrated AS "isMigrated", price_sol AS "priceSol", mcap_sol AS "mcapSol", name, symbol, uri,
  volume_sol AS "volumeSol", volume_24h_sol AS "volume24hSol", trades, creator_fees_sol AS "creatorFeesSol", fees_sol AS "feesSol", updated_at AS "updatedAt"`;
const TRADE_COLS = `sig || ':' || ix_idx AS sig, pool, mint, side, sol, tokens, fee_sol AS "feeSol", wallet, via_ui AS "viaUi", ts, dev_buy AS "devBuy"`;
const tradeOut = (r: TradeRow & { devBuy: boolean }): TradeRow => { const { devBuy, ...t } = r; return devBuy ? { ...t, devBuy: true } : t; };
const actOut = (r: Record<string, unknown>): Activity => Object.fromEntries(Object.entries(r).filter(([, v]) => v !== null)) as unknown as Activity;

/** /tokens sort keys -> columns (whitelist). */
const SORT: Record<string, string> = { createdAt: "created_at", mcapSol: "mcap_sol", mcapUsd: "mcap_sol", priceSol: "price_sol", progress: "progress", volumeSol: "volume_sol",
  volume24hSol: "volume_24h_sol", trades: "trades", quoteReserveSol: "quote_reserve_sol", feesSol: "fees_sol", name: "name", symbol: "symbol", updatedAt: "updated_at" };

export interface TokenQuery { tier?: string; status?: string; q?: string; sort?: string; order?: string; limit: number; offset: number }

export const store = {
  // ---- tokens ----
  async listTokens(f: TokenQuery): Promise<{ total: number; items: Token[] }> {
    const where: string[] = [], args: unknown[] = [];
    if (f.tier) { args.push(f.tier); where.push(`tier = $${args.length}`); }
    if (f.status === "graduated") where.push("is_migrated");
    if (f.status === "bonding") where.push("NOT is_migrated");
    if (f.q) { args.push(`%${f.q.toLowerCase().replace(/[\\%_]/g, (c) => "\\" + c)}%`); where.push(`(lower(name) LIKE $${args.length} OR lower(symbol) LIKE $${args.length} OR lower(mint) LIKE $${args.length})`); }
    const w = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const col = SORT[f.sort ?? "createdAt"] ?? "created_at", dir = f.order === "asc" ? "ASC" : "DESC";
    args.push(f.limit, f.offset);
    const r = await db.query(`SELECT ${TOKEN_COLS}, count(*) OVER() AS total FROM tokens ${w} ORDER BY ${col} ${dir}, mint ${dir} LIMIT $${args.length - 1} OFFSET $${args.length}`, args);
    const total = r.rows.length ? Number(r.rows[0].total) : f.offset > 0 ? Number((await db.query(`SELECT count(*)::int n FROM tokens ${w}`, args.slice(0, -2))).rows[0].n) : 0;
    return { total, items: r.rows.map(({ total: _t, ...t }) => t as Token) };
  },
  async getToken(mintOrPool: string): Promise<Token | null> {
    return (await db.query<Token>(`SELECT ${TOKEN_COLS} FROM tokens WHERE mint = $1 OR pool = $1 ORDER BY (mint = $1) DESC LIMIT 1`, [mintOrPool])).rows[0] ?? null;
  },
  async tokens(): Promise<Token[]> { return (await db.query<Token>(`SELECT ${TOKEN_COLS} FROM tokens ORDER BY created_at DESC, mint`)).rows; },
  async tokensByCreator(creator: string): Promise<Token[]> { return (await db.query<Token>(`SELECT ${TOKEN_COLS} FROM tokens WHERE creator = $1 ORDER BY created_at DESC, mint`, [creator])).rows; },
  async tokenCount(): Promise<number> { return (await db.query<{ n: number }>("SELECT count(*)::int n FROM tokens")).rows[0].n; },
  async symbols(mints: string[]): Promise<Map<string, string>> {
    if (!mints.length) return new Map();
    return new Map((await db.query<{ mint: string; symbol: string }>("SELECT mint, symbol FROM tokens WHERE mint = ANY($1)", [mints])).rows.map((r) => [r.mint, r.symbol]));
  },
  async upsertToken(t: Token, q: Q = db) {
    await q.query(`INSERT INTO tokens (mint,pool,config,tier,anti_sniper,creator,created_at,quote_reserve_sol,threshold_sol,progress,is_migrated,price_sol,mcap_sol,name,symbol,uri,volume_sol,volume_24h_sol,trades,creator_fees_sol,fees_sol,updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
      ON CONFLICT (mint) DO UPDATE SET pool=EXCLUDED.pool, config=EXCLUDED.config, tier=EXCLUDED.tier, anti_sniper=EXCLUDED.anti_sniper, creator=EXCLUDED.creator,
        created_at=EXCLUDED.created_at, quote_reserve_sol=EXCLUDED.quote_reserve_sol, threshold_sol=EXCLUDED.threshold_sol, progress=EXCLUDED.progress,
        is_migrated=EXCLUDED.is_migrated, price_sol=EXCLUDED.price_sol, mcap_sol=EXCLUDED.mcap_sol, name=EXCLUDED.name, symbol=EXCLUDED.symbol, uri=EXCLUDED.uri,
        volume_sol=EXCLUDED.volume_sol, volume_24h_sol=EXCLUDED.volume_24h_sol, trades=EXCLUDED.trades, creator_fees_sol=EXCLUDED.creator_fees_sol,
        fees_sol=EXCLUDED.fees_sol, updated_at=EXCLUDED.updated_at`,
      [t.mint, t.pool, t.config, t.tier, t.antiSniper, t.creator, Math.round(t.createdAt), t.quoteReserveSol, t.thresholdSol, t.progress, t.isMigrated, t.priceSol, t.mcapSol,
        t.name, t.symbol, t.uri, t.volumeSol, t.volume24hSol, t.trades, t.creatorFeesSol, t.feesSol, Math.round(t.updatedAt)]);
  },

  // ---- trades ----
  /** Insert a swap; false when sig+ix_idx already exists. */
  async addTrade(t: TradeRow, q: Q = db): Promise<boolean> {
    const { sig, ixIdx } = splitSig(t.sig);
    const r = await q.query(`INSERT INTO trades (sig,ix_idx,pool,mint,side,sol,tokens,fee_sol,wallet,via_ui,dev_buy,ts) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT DO NOTHING`,
      [sig, ixIdx, t.pool, t.mint, t.side, t.sol, t.tokens, t.feeSol, t.wallet, t.viaUi, !!t.devBuy, Math.round(t.ts)]);
    return (r.rowCount ?? 0) > 0;
  },
  async tradesFor(mint: string, limit = 100): Promise<TradeRow[]> {
    return (await db.query(`SELECT ${TRADE_COLS} FROM trades WHERE mint = $1 ORDER BY ts DESC, sig DESC, ix_idx DESC LIMIT $2`, [mint, limit])).rows.map(tradeOut);
  },
  async walletTrades(wallet: string, limit = 200): Promise<(TradeRow & { symbol: string })[]> {
    return (await db.query(`SELECT t.sig || ':' || t.ix_idx AS sig, t.pool, t.mint, t.side, t.sol, t.tokens, t.fee_sol AS "feeSol", t.wallet, t.via_ui AS "viaUi", t.ts, t.dev_buy AS "devBuy", coalesce(k.symbol,'') AS symbol
      FROM trades t LEFT JOIN tokens k ON k.mint = t.mint WHERE t.wallet = $1 ORDER BY t.ts DESC, t.sig DESC, t.ix_idx DESC LIMIT $2`, [wallet, limit])).rows
      .map((r) => { const { symbol, ...rest } = r; return { ...tradeOut(rest), symbol }; });
  },
  /** Per-mint aggregates used by the indexer to fill token stats. */
  async tradeAgg(mint: string, dayAgo: number, q: Q = db) {
    const r = await q.query<{ n: number; vol: number; vol24: number; fees: number }>(
      `SELECT count(*)::int n, coalesce(sum(sol),0)::float8 vol, coalesce(sum(sol) FILTER (WHERE ts >= $2),0)::float8 vol24, coalesce(sum(fee_sol),0)::float8 fees FROM trades WHERE mint = $1`, [mint, dayAgo]);
    return r.rows[0];
  },
  async tradeCount(): Promise<number> { return (await db.query<{ n: number }>("SELECT count(*)::int n FROM trades")).rows[0].n; },

  // ---- indexer cursor ----
  async lastSig(pool: string): Promise<string | undefined> { return (await db.query<{ last_sig: string }>("SELECT last_sig FROM pool_cursors WHERE pool = $1", [pool])).rows[0]?.last_sig; },
  async setLastSig(pool: string, sig: string, q: Q = db) {
    await q.query("INSERT INTO pool_cursors (pool,last_sig,updated_at) VALUES ($1,$2,$3) ON CONFLICT (pool) DO UPDATE SET last_sig = EXCLUDED.last_sig, updated_at = EXCLUDED.updated_at", [pool, sig, Date.now()]);
  },

  // ---- activity ----
  async addActivity(a: Activity, q: Q = db, kind: "activity" | "burn" = "activity") {
    await q.query("INSERT INTO activity (id,kind,type,mint,symbol,ts,amount,side,wallet,sig) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (id) DO NOTHING",
      [a.id, kind, a.type, a.mint, a.symbol ?? "", Math.round(a.ts), a.amount ?? null, a.side ?? null, a.wallet ?? null, a.sig ?? null]);
  },
  async listActivity(since: number, limit: number): Promise<Activity[]> {
    return (await db.query(`SELECT a.id, a.type, a.mint, CASE WHEN a.symbol <> '' THEN a.symbol ELSE coalesce(k.symbol,'') END AS symbol, a.ts, a.amount, a.side, a.wallet, a.sig
      FROM activity a LEFT JOIN tokens k ON k.mint = a.mint WHERE a.ts > $1 ORDER BY a.ts DESC, a.id DESC LIMIT $2`, [since, limit])).rows.map(actOut);
  },
  async burns(): Promise<Activity[]> { return (await db.query("SELECT id, type, mint, symbol, ts, amount, side, wallet, sig FROM activity WHERE kind = 'burn' ORDER BY ts DESC")).rows.map(actOut); },
  /** Keep the newest `keep` feed rows (burn runs are kept forever). */
  async trimActivity(keep = 5000) {
    await db.query("DELETE FROM activity WHERE kind = 'activity' AND id IN (SELECT id FROM activity WHERE kind = 'activity' ORDER BY ts DESC, id DESC OFFSET $1)", [keep]);
  },

  // ---- Jupiter Lock escrows ----
  async addEscrow(mint: string, escrow: string) {
    await db.query("INSERT INTO lock_escrows (escrow, mint, added_at) VALUES ($1,$2,$3) ON CONFLICT (escrow) DO NOTHING", [escrow, mint, Date.now()]);
  },
  async escrowsFor(mint: string): Promise<string[]> { return (await db.query<{ escrow: string }>("SELECT escrow FROM lock_escrows WHERE mint = $1 ORDER BY added_at, escrow", [mint])).rows.map((r) => r.escrow); },
  async allEscrows(): Promise<string[]> { return (await db.query<{ escrow: string }>("SELECT escrow FROM lock_escrows ORDER BY added_at, escrow")).rows.map((r) => r.escrow); },
  /** Upsert observed lock states in one transaction. */
  async recordLocks(infos: (LockMeta & { escrow: string })[]) {
    if (!infos.length) return;
    await tx(async (c) => { for (const l of infos) await c.query(
      `INSERT INTO lock_escrows (escrow,mint,creator,cliff_time,end_time,total,locked,cancelled,seen_at,added_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9)
       ON CONFLICT (escrow) DO UPDATE SET mint=EXCLUDED.mint, creator=EXCLUDED.creator, cliff_time=EXCLUDED.cliff_time, end_time=EXCLUDED.end_time,
         total=EXCLUDED.total, locked=EXCLUDED.locked, cancelled=EXCLUDED.cancelled, seen_at=EXCLUDED.seen_at`,
      [l.escrow, l.mint, l.creator, l.cliffTime, l.endTime, l.total, l.locked, l.cancelled, l.seenAt]); });
  },
  async lockedAt(): Promise<Record<string, number>> {
    return Object.fromEntries((await db.query<{ escrow: string; locked_at: number }>("SELECT escrow, locked_at FROM lock_escrows WHERE locked_at IS NOT NULL")).rows.map((r) => [r.escrow, r.locked_at]));
  },
  async setLockedAt(escrow: string, ts: number) { await db.query("UPDATE lock_escrows SET locked_at = $2 WHERE escrow = $1", [escrow, ts]); },
  /** Dev-lock status per mint from recorded lock state: active = not cancelled, tokens still locked, before end. */
  async devLocks(mints: string[]): Promise<Map<string, number>> {
    if (!mints.length) return new Map();
    const r = await db.query<{ mint: string; unlock_at: number }>(
      `SELECT mint, max(cliff_time) AS unlock_at FROM lock_escrows WHERE mint = ANY($1) AND NOT cancelled AND locked IS NOT NULL AND locked::numeric > 0 AND end_time > $2 GROUP BY mint`,
      [mints, Math.floor(Date.now() / 1000)]);
    return new Map(r.rows.map((x) => [x.mint, Number(x.unlock_at)]));
  },

  // ---- claims / settings ----
  async logClaim(creator: string, pool: string, mint: string | null, kind: "trading" | "migration") {
    await db.query("INSERT INTO claims (creator,pool,mint,kind,created_at) VALUES ($1,$2,$3,$4,$5)", [creator, pool, mint, kind, Date.now()]);
  },
  async getSetting<T>(key: string): Promise<T | undefined> { return (await db.query("SELECT value FROM settings WHERE key = $1", [key])).rows[0]?.value as T | undefined; },
  async setSetting(key: string, value: unknown) {
    await db.query("INSERT INTO settings (key,value,updated_at) VALUES ($1,$2,$3) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at", [key, JSON.stringify(value), Date.now()]);
  },
  async allTrades(since = 0): Promise<TradeRow[]> {
    return (await db.query(`SELECT ${TRADE_COLS} FROM trades WHERE ts >= $1 ORDER BY ts DESC, sig DESC, ix_idx DESC`, [since])).rows.map(tradeOut);
  },

  // ---- candle points ----
  async addPoint(p: { sig: string; ixIdx: number; mint: string; ts: number; priceSol: number; amount: number; side: "buy" | "sell"; sol?: number }, q: Q = db): Promise<boolean> {
    if (!(p.priceSol > 0) || !Number.isFinite(p.ts)) return false;
    const r = await q.query("INSERT INTO trade_points (sig,ix_idx,mint,ts,price_sol,amount,side,sol) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT DO NOTHING",
      [p.sig, p.ixIdx, p.mint, Math.round(p.ts), p.priceSol, p.amount, p.side, p.sol ?? null]);
    return (r.rowCount ?? 0) > 0;
  },
  async points(mint: string, from = 0, to = Number.MAX_SAFE_INTEGER) {
    const r = await db.query(`SELECT mint, sig, ix_idx AS "ixIdx", ts, price_sol AS "priceSol", amount, side, sol FROM trade_points WHERE mint = $1 AND ts >= $2 AND ts <= $3 ORDER BY ts, sig, ix_idx`, [mint, from, to]);
    return r.rows.map((x) => (x.sol === null ? (({ sol: _s, ...y }) => y)(x) : x)) as { mint: string; sig: string; ixIdx: number; ts: number; priceSol: number; amount: number; side: "buy" | "sell"; sol?: number }[];
  },

  // ---- auth ----
  async setNonce(address: string, nonce: string, expiresAt: number) {
    await db.query("INSERT INTO auth_nonces (address,nonce,expires_at) VALUES ($1,$2,$3) ON CONFLICT (address) DO UPDATE SET nonce = EXCLUDED.nonce, expires_at = EXCLUDED.expires_at", [address, nonce, expiresAt]);
    await db.query("DELETE FROM auth_nonces WHERE expires_at < $1", [Date.now()]);
  },
  async getNonce(address: string): Promise<{ nonce: string; exp: number } | undefined> {
    return (await db.query<{ nonce: string; exp: number }>("SELECT nonce, expires_at AS exp FROM auth_nonces WHERE address = $1", [address])).rows[0];
  },
  /** Atomically consume a nonce (single use). */
  async takeNonce(address: string, nonce: string): Promise<boolean> {
    return ((await db.query("DELETE FROM auth_nonces WHERE address = $1 AND nonce = $2 AND expires_at >= $3", [address, nonce, Date.now()])).rowCount ?? 0) > 0;
  },
  async addSession(tokenHash: string, address: string, expiresAt: number) {
    await db.query("INSERT INTO auth_sessions (token_hash,address,expires_at,created_at) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING", [tokenHash, address, expiresAt, Date.now()]);
    await db.query("DELETE FROM auth_sessions WHERE expires_at < $1", [Date.now()]);
  },
  async sessionValid(tokenHash: string): Promise<boolean> {
    return (await db.query("SELECT 1 FROM auth_sessions WHERE token_hash = $1 AND expires_at > $2", [tokenHash, Date.now()])).rows.length > 0;
  },

  // ---- media ----
  async putMedia(id: string, ext: string, contentType: string, data: Buffer) {
    await db.query("INSERT INTO media_files (id,ext,content_type,data,created_at) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id,ext) DO NOTHING", [id, ext, contentType, data, Date.now()]);
  },
  async getMedia(id: string, ext: string): Promise<{ type: string; data: Buffer } | undefined> {
    return (await db.query<{ type: string; data: Buffer }>("SELECT content_type AS type, data FROM media_files WHERE id = $1 AND ext = $2", [id, ext])).rows[0];
  },
  async getLogo(uriHash: string): Promise<{ type: string | null; data: Buffer | null } | undefined> {
    return (await db.query<{ type: string | null; data: Buffer | null }>("SELECT content_type AS type, data FROM logo_cache WHERE uri_hash = $1", [uriHash])).rows[0];
  },
  async putLogo(uriHash: string, uri: string, type: string | null, data: Buffer | null) {
    await db.query("INSERT INTO logo_cache (uri_hash,uri,content_type,data,fetched_at) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (uri_hash) DO UPDATE SET content_type = EXCLUDED.content_type, data = EXCLUDED.data, fetched_at = EXCLUDED.fetched_at",
      [uriHash, uri, type, data, Date.now()]);
  },
  /** uri_hash -> has image (for sync image URL decisions). */
  async logoIndex(): Promise<Map<string, boolean>> {
    return new Map((await db.query<{ uri_hash: string; has: boolean }>("SELECT uri_hash, data IS NOT NULL AS has FROM logo_cache")).rows.map((r) => [r.uri_hash, r.has]));
  },
};

