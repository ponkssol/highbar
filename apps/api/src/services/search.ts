/** Global search, hot coins (24h volume + hourly sparkline) and top traders, read-only over tokens / trades / trade_points.
 *  Pure helpers are exported for tests; every SQL function takes the query handle (pool in the API, PGlite in tests). */
export type Sql = { query: (text: string, params?: unknown[]) => Promise<{ rows: any[] }> };

export const HOUR_MS = 3_600_000, DAY_MS = 86_400_000;
export const SEARCH_MIN_LEN = 2, SEARCH_MAX_LEN = 64;
/** Mint prefix matching starts at this many base58 chars (shorter prefixes match too many random mints). */
export const MINT_PREFIX_MIN = 4;
const BASE58_RUN = /^[1-9A-HJ-NP-Za-km-z]+$/;
import { hiddenMints } from "./hiddenTokens.js";

/** Escape LIKE wildcards (and the escape char itself) in user input; used with LIKE ... ESCAPE '\'. */
export const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => "\\" + c);

export interface SearchQuery { q: string; /** lower-cased q for name/symbol matching */ lower: string; /** q is a base58 run (can prefix-match a mint / wallet) */ base58: boolean }
/** Trim, strip control / zero-width chars, cap length. null = nothing to search (empty, or shorter than SEARCH_MIN_LEN). */
export function normalizeQuery(v: unknown): SearchQuery | null {
  if (typeof v !== "string") return null;
  const q = v.replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u2064\ufeff]/g, "").trim().slice(0, SEARCH_MAX_LEN);
  if (q.length < SEARCH_MIN_LEN) return null; // a mint / wallet is 32-44 chars, so "looks like an address" never falls under this
  return { q, lower: q.toLowerCase(), base58: BASE58_RUN.test(q) };
}

/** Integer in [1, max]; default when missing or not a number (search is forgiving, never a 400). */
export function clampLimit(v: unknown, def: number, max: number): number {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n >= 1 ? Math.min(max, n) : def;
}

/** Ranking used by the SQL ORDER BY (mirrored here for tests): 0 exact symbol (ci) or exact mint, 1 symbol prefix,
 *  2 name prefix or mint prefix, 3 contains (symbol or name). -1 = no match. */
export function matchRank(t: { mint: string; name: string; symbol: string }, s: SearchQuery): number {
  const sym = t.symbol.toLowerCase(), name = t.name.toLowerCase();
  if (sym === s.lower || t.mint === s.q) return 0;
  if (sym.startsWith(s.lower)) return 1;
  if (name.startsWith(s.lower) || (s.base58 && s.q.length >= MINT_PREFIX_MIN && t.mint.startsWith(s.q))) return 2;
  if (sym.includes(s.lower) || name.includes(s.lower)) return 3;
  return -1;
}

export interface TokenHit { mint: string; uri: string; name: string; symbol: string; tier: string; mcapSol: number; progress: number; isMigrated: boolean; createdAt: number }
/** Tokens by symbol / name (case-insensitive, wildcards escaped) and mint (exact or prefix, case-sensitive). Same rows as GET /tokens (hidden test tokens left out). */
export async function searchTokens(sql: Sql, s: SearchQuery, limit: number, hidden: readonly string[] = hiddenMints()): Promise<TokenHit[]> {
  const like = escapeLike(s.lower), mintPrefix = s.base58 && s.q.length >= MINT_PREFIX_MIN ? `${escapeLike(s.q)}%` : null;
  const r = await sql.query(
    `SELECT mint, uri, name, symbol, tier, mcap_sol AS "mcapSol", progress, is_migrated AS "isMigrated", created_at AS "createdAt",
       CASE WHEN lower(symbol) = $1 OR mint = $4 THEN 0
            WHEN lower(symbol) LIKE $2 || '%' ESCAPE '\\' THEN 1
            WHEN lower(name) LIKE $2 || '%' ESCAPE '\\' OR ($3::text IS NOT NULL AND mint LIKE $3 ESCAPE '\\') THEN 2
            ELSE 3 END AS rank
     FROM tokens
     WHERE (lower(symbol) LIKE '%' || $2 || '%' ESCAPE '\\' OR lower(name) LIKE '%' || $2 || '%' ESCAPE '\\'
        OR mint = $4 OR ($3::text IS NOT NULL AND mint LIKE $3 ESCAPE '\\'))
       AND NOT (mint = ANY($6::text[]))
     ORDER BY rank, mcap_sol DESC, created_at DESC, mint LIMIT $5`,
    [s.lower, like, mintPrefix, s.q, limit, [...hidden]]);
  return r.rows.map(({ rank: _r, ...t }) => ({ ...t, mcapSol: Number(t.mcapSol), progress: Number(t.progress), createdAt: Number(t.createdAt) }));
}

export interface WalletStats { wallet: string; volumeSol: number; trades: number; pnlSol: number | null }
/** Per-wallet curve stats over all indexed trades, batched: volume, trade count and an estimated PnL =
 *  SOL from sells - SOL into buys + remaining net curve tokens x the token's last indexed price (curve trades only). */
export async function walletStats(sql: Sql, wallets: string[]): Promise<Map<string, WalletStats>> {
  if (!wallets.length) return new Map();
  const r = await sql.query(
    `WITH pos AS (
       SELECT wallet, mint, sum(sol) AS vol, count(*) AS n,
              sum(CASE WHEN side = 'sell' THEN sol ELSE -sol END) AS cash,
              sum(CASE WHEN side = 'buy' THEN tokens ELSE -tokens END) AS net
       FROM trades WHERE wallet = ANY($1) GROUP BY wallet, mint)
     SELECT p.wallet, sum(p.vol)::float8 AS "volumeSol", sum(p.n)::int AS trades,
            sum(p.cash + greatest(p.net, 0) * coalesce(k.price_sol, 0))::float8 AS "pnlSol"
     FROM pos p LEFT JOIN tokens k ON k.mint = p.mint GROUP BY p.wallet`, [wallets]);
  return new Map(r.rows.map((x) => [x.wallet, { wallet: x.wallet, volumeSol: Number(x.volumeSol), trades: Number(x.trades), pnlSol: x.pnlSol == null ? null : Number(x.pnlSol) }]));
}

/** Wallets (traders, or token creators) whose address equals or starts with q (case-sensitive base58). Exact match first, then volume. */
export async function searchWallets(sql: Sql, s: SearchQuery, limit: number): Promise<WalletStats[]> {
  if (!s.base58) return [];
  const prefix = `${escapeLike(s.q)}%`;
  const r = await sql.query(
    `SELECT w.wallet FROM (SELECT DISTINCT wallet FROM trades WHERE wallet LIKE $1 ESCAPE '\\'
                           UNION SELECT creator FROM tokens WHERE creator LIKE $1 ESCAPE '\\') w
     LEFT JOIN LATERAL (SELECT coalesce(sum(sol), 0) AS vol FROM trades t WHERE t.wallet = w.wallet) v ON true
     ORDER BY (w.wallet = $2) DESC, v.vol DESC, w.wallet LIMIT $3`, [prefix, s.q, limit]);
  const wallets = r.rows.map((x) => x.wallet as string), st = await walletStats(sql, wallets);
  return wallets.map((w) => st.get(w) ?? { wallet: w, volumeSol: 0, trades: 0, pnlSol: null });
}

export interface HotRow { mint: string; uri: string; name: string; symbol: string; mcapSol: number; priceSol: number; vol24: number; lastTs: number | null }
/** Hot coins: most SOL traded in the last 24h (from trades, not the per-token cache), then the most recently traded, then the newest. Hidden test tokens left out. */
export async function hotTokens(sql: Sql, limit: number, now = Date.now(), hidden: readonly string[] = hiddenMints()): Promise<HotRow[]> {
  const r = await sql.query(
    `WITH v AS (SELECT mint, sum(sol) AS vol, max(ts) AS last FROM trades WHERE ts >= $1 GROUP BY mint),
          recent AS (SELECT mint, max(ts) AS last FROM (SELECT mint, ts FROM trades ORDER BY ts DESC LIMIT 5000) x GROUP BY mint)
     SELECT k.mint, k.uri, k.name, k.symbol, k.mcap_sol AS "mcapSol", k.price_sol AS "priceSol",
            coalesce(v.vol, 0)::float8 AS vol24, coalesce(v.last, recent.last) AS "lastTs"
     FROM tokens k LEFT JOIN v ON v.mint = k.mint LEFT JOIN recent ON recent.mint = k.mint
     WHERE NOT (k.mint = ANY($3::text[]))
     ORDER BY coalesce(v.vol, 0) DESC, coalesce(v.last, recent.last) DESC NULLS LAST, k.created_at DESC, k.mint LIMIT $2`, [now - DAY_MS, limit, [...hidden]]);
  return r.rows.map((x) => ({ ...x, mcapSol: Number(x.mcapSol), priceSol: Number(x.priceSol), vol24: Number(x.vol24), lastTs: x.lastTs == null ? null : Number(x.lastTs) }));
}

export interface PricePoint { mint: string; bucket: number; price: number }
/** One batched query over trade_points: per mint the close (last price) of each hourly bucket in the window, the last price
 *  before the window (bucket -1, seeds the forward fill / 24h change) and the first price inside it (bucket -2). */
export async function hourlyCloses(sql: Sql, mints: string[], startMs: number): Promise<PricePoint[]> {
  if (!mints.length) return [];
  const r = await sql.query(
    `(SELECT DISTINCT ON (mint, b) mint, b AS bucket, price_sol AS price
        FROM (SELECT mint, floor((ts - $2) / ${HOUR_MS}.0)::int AS b, ts, sig, ix_idx, price_sol FROM trade_points WHERE mint = ANY($1) AND ts >= $2) x
        ORDER BY mint, b, ts DESC, sig DESC, ix_idx DESC)
     UNION ALL
     (SELECT DISTINCT ON (mint) mint, -1, price_sol FROM trade_points WHERE mint = ANY($1) AND ts < $2 ORDER BY mint, ts DESC, sig DESC, ix_idx DESC)
     UNION ALL
     (SELECT DISTINCT ON (mint) mint, -2, price_sol FROM trade_points WHERE mint = ANY($1) AND ts >= $2 ORDER BY mint, ts, sig, ix_idx)`, [mints, startMs]);
  return r.rows.map((x) => ({ mint: x.mint, bucket: Number(x.bucket), price: Number(x.price) }));
}

/** Hourly window ending with the current (partial) hour: `buckets` UTC-aligned hours, oldest first. */
export function sparkWindow(now: number, buckets = 24) { const end = Math.floor(now / HOUR_MS) * HOUR_MS; return { start: end - (buckets - 1) * HOUR_MS, buckets }; }

/** Forward-filled closes (oldest first) + 24h change. Leading hours before the first trade use the pre-window close, else the
 *  first trade price; no trades at all -> flat at fallbackPrice (or [] when that is not positive). change is vs the pre-window
 *  close, else vs the first trade in the window (token younger than the window); null when there is no reference. */
export function buildSpark(points: PricePoint[], buckets: number, fallbackPrice: number): { spark: number[]; change24hPct: number | null } {
  const closes = new Map<number, number>(); let seed: number | null = null, first: number | null = null;
  for (const p of points) { if (p.bucket === -1) seed = p.price; else if (p.bucket === -2) first = p.price; else if (p.bucket >= 0 && p.bucket < buckets) closes.set(p.bucket, p.price); }
  if (!closes.size && seed == null) return { spark: fallbackPrice > 0 ? Array(buckets).fill(fallbackPrice) : [], change24hPct: null };
  let cur = seed ?? first ?? closes.get(Math.min(...closes.keys()))!;
  const spark: number[] = [];
  for (let b = 0; b < buckets; b++) { cur = closes.get(b) ?? cur; spark.push(cur); }
  const ref = seed ?? first, last = spark[spark.length - 1];
  return { spark, change24hPct: ref && ref > 0 ? round((last / ref - 1) * 100, 2) : null };
}

/** Top traders by SOL volume in [from, to) (same aggregation as GET /leaderboard/traders, done in SQL). */
export async function topTraders(sql: Sql, limit: number, from = 0, to = Number.MAX_SAFE_INTEGER): Promise<{ wallet: string; volumeSol: number; trades: number }[]> {
  const r = await sql.query(
    `SELECT wallet, sum(sol)::float8 AS "volumeSol", count(*)::int AS trades FROM trades WHERE ts >= $1 AND ts < $2
     GROUP BY wallet ORDER BY sum(sol) DESC, wallet LIMIT $3`, [from, to, limit]);
  return r.rows.map((x) => ({ wallet: x.wallet, volumeSol: Number(x.volumeSol), trades: Number(x.trades) }));
}

export const round = (n: number, d: number) => { const f = 10 ** d; return Math.round(n * f) / f; };

/** Small in-memory TTL cache with in-flight de-duplication (per API instance), bounded size. */
export class TtlCache<T> {
  private m = new Map<string, { at: number; v: Promise<T> }>();
  constructor(readonly ttlMs: number, readonly max = 500, private now: () => number = Date.now) {}
  get(key: string, load: () => Promise<T>): Promise<T> {
    const t = this.now(), hit = this.m.get(key);
    if (hit && t - hit.at < this.ttlMs) return hit.v;
    if (this.m.size >= this.max) { for (const [k, e] of this.m) if (t - e.at >= this.ttlMs) this.m.delete(k); if (this.m.size >= this.max) this.m.delete(this.m.keys().next().value!); }
    const v = load();
    this.m.set(key, { at: t, v });
    v.catch(() => { if (this.m.get(key)?.v === v) this.m.delete(key); }); // never cache a failure
    return v;
  }
  get size() { return this.m.size; }
}
