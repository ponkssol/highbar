/** Header search data layer. Every request goes through apiBase() (browser: the same-origin /hb-api proxy, server: API_URL).
 *  Primary: GET /search?q=&limit= (server ranked, q of 2+ chars), GET /search/hot?limit= (with 24 hourly closes in spark),
 *  GET /search/traders?limit=&window=all (pnlSol only for window=all). Parsing is tolerant: only mint or wallet is required.
 *  If a request errors (network, 5xx, or a 404 on an older api) the call falls back to existing endpoints: GET /tokens?q= (name,
 *  ticker or mint, matched on the server), GET /tokens?sort=volume24hSol, GET /leaderboard/traders and GET /tokens/:mint/candles. */
import { apiBase, apiHeaders } from "./api";

export interface SearchToken { mint: string; name: string; symbol: string; image: string | null; marketCapSol: number | null; marketCapUsd: number | null; createdAt: number | null }
export interface SearchUser { wallet: string; label: string | null; volumeSol: number | null; pnlSol: number | null }
export interface HotCoin extends SearchToken { volume24hSol: number | null; change24hPct: number | null; spark: number[] | null }
export interface Trader { wallet: string; label: string | null; volumeSol: number; pnlSol: number | null; trades: number | null }
export interface SearchResult { tokens: SearchToken[]; users: SearchUser[]; source: "search" | "tokens" }

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown) => (typeof v === "string" ? v : "");
const strOrNull = (v: unknown) => (typeof v === "string" && v ? v : null);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
/** createdAt in ms. Seconds (anything below 1e12) are scaled up so either unit works. */
const ms = (v: unknown) => { const n = num(v) ?? (typeof v === "string" ? Date.parse(v) : NaN); return Number.isFinite(n) && n > 0 ? (n < 1e12 ? n * 1000 : n) : null; };

/** Tolerant token parser: /search, /search/hot and /tokens rows all pass through here. Only mint is required. */
export function parseToken(o: unknown): SearchToken | null {
  if (!isObj(o) || !str(o.mint)) return null;
  const mint = str(o.mint);
  return {
    mint, name: str(o.name) || mint.slice(0, 6), symbol: str(o.symbol) || str(o.ticker) || "?", image: strOrNull(o.image),
    marketCapSol: num(o.marketCapSol) ?? num(o.mcapSol), marketCapUsd: num(o.marketCapUsd) ?? num(o.mcapUsd), createdAt: ms(o.createdAt),
  };
}
function parseUser(o: unknown): SearchUser | null {
  if (!isObj(o) || !str(o.wallet)) return null;
  return { wallet: str(o.wallet), label: strOrNull(o.label) ?? strOrNull(o.displayName), volumeSol: num(o.volumeSol), pnlSol: num(o.pnlSol) };
}
function parseTrader(o: unknown): Trader | null {
  if (!isObj(o) || !str(o.wallet)) return null;
  return { wallet: str(o.wallet), label: strOrNull(o.label) ?? strOrNull(o.displayName), volumeSol: num(o.volumeSol) ?? 0, pnlSol: num(o.pnlSol), trades: num(o.trades) };
}
const list = <T,>(v: unknown, f: (o: unknown) => T | null): T[] => (Array.isArray(v) ? v.flatMap((o) => { const r = f(o); return r ? [r] : []; }) : []);

async function getJson(path: string, signal?: AbortSignal, timeoutMs = 4000): Promise<unknown> {
  const c = new AbortController(), stop = () => c.abort();
  const timer = setTimeout(stop, timeoutMs);
  signal?.addEventListener("abort", stop);
  if (signal?.aborted) stop();
  try {
    const res = await fetch(`${apiBase()}${path}`, { cache: "no-store", headers: apiHeaders(), signal: c.signal });
    if (!res.ok) throw Object.assign(new Error(`${path}: ${res.status}`), { status: res.status });
    return await res.json();
  } finally { clearTimeout(timer); signal?.removeEventListener("abort", stop); }
}
/** A route that answered 404 is skipped for 5 minutes, so the fallback runs straight away instead of a 404 on every keystroke. */
const missing = new Map<string, number>();
const MISSING_MS = 5 * 60_000;
async function tryNew(route: string, path: string, signal?: AbortSignal): Promise<unknown | undefined> {
  if ((missing.get(route) ?? 0) > Date.now()) return undefined;
  try { return await getJson(path, signal); } catch (e) {
    if (signal?.aborted) throw e;
    if ((e as { status?: number }).status === 404) missing.set(route, Date.now() + MISSING_MS);
    return undefined;
  }
}

/** Base58 Solana address (mint or wallet): 32 to 44 chars, no 0 O I l. */
export const isAddress = (q: string) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(q.trim());

/** /search answers empty below this many characters, so the modal does not ask. */
export const SEARCH_MIN_CHARS = 2;

/** Search coins and users. The one place the modal fetches results from. Keeps the server's ranking order. */
export async function searchAll(q: string, limit = 8, signal?: AbortSignal): Promise<SearchResult> {
  const query = q.trim().slice(0, 64);
  if (query.length < SEARCH_MIN_CHARS) return { tokens: [], users: [], source: "search" };
  const j = await tryNew("search", `/search?${new URLSearchParams({ q: query, limit: String(limit) })}`, signal);
  if (isObj(j) && (Array.isArray(j.tokens) || Array.isArray(j.users))) return { tokens: list(j.tokens, parseToken).slice(0, limit), users: list(j.users, parseUser).slice(0, limit), source: "search" };
  // Fallback: /tokens already matches q on name, symbol and mint (case-insensitive) on the server. No user search exists yet.
  const t = await getJson(`/tokens?${new URLSearchParams({ q: query, limit: String(limit), sort: "volume24hSol", order: "desc" })}`, signal);
  return { tokens: list(isObj(t) ? t.items : null, parseToken), users: [], source: "tokens" };
}

/** Hot coins: /search/hot, else the token list sorted by 24h volume (sparklines then come from candles, see loadSpark). */
export async function hotCoins(limit = 12, signal?: AbortSignal): Promise<HotCoin[]> {
  const j = await tryNew("hot", `/search/hot?limit=${limit}`, signal);
  if (isObj(j) && Array.isArray(j.coins)) {
    return list(j.coins, (o) => { const t = parseToken(o); if (!t || !isObj(o)) return null; const s = Array.isArray(o.spark) ? o.spark.filter((x): x is number => num(x) != null) : null; return { ...t, volume24hSol: num(o.volume24hSol), change24hPct: num(o.change24hPct), spark: s && s.length > 1 ? s : null }; });
  }
  const t = await getJson(`/tokens?limit=${limit}&sort=volume24hSol&order=desc`, signal);
  return list(isObj(t) ? t.items : null, (o) => { const r = parseToken(o); return r ? { ...r, volume24hSol: isObj(o) ? num(o.volume24hSol) : null, change24hPct: null, spark: null } : null; });
}

/** Top traders: /search/traders over all time (the only window with an estimated pnlSol), else the all time traders leaderboard (volume, no PnL). */
export async function topTraders(limit = 12, signal?: AbortSignal): Promise<Trader[]> {
  const j = await tryNew("traders", `/search/traders?limit=${limit}&window=all`, signal);
  if (isObj(j) && Array.isArray(j.traders)) return list(j.traders, parseTrader);
  return list(await getJson(`/leaderboard/traders?window=all&limit=${limit}`, signal), parseTrader);
}

/** Sparkline from candles: 24 hourly closes, cached per mint for 2 minutes, at most 3 requests in flight. */
const sparkCache = new Map<string, { at: number; p: Promise<number[] | null> }>();
let inFlight = 0; const queue: (() => void)[] = [];
const slot = () => new Promise<void>((r) => { if (inFlight < 3) { inFlight++; r(); } else queue.push(() => { inFlight++; r(); }); });
const release = () => { inFlight--; queue.shift()?.(); };
export function loadSpark(mint: string): Promise<number[] | null> {
  const hit = sparkCache.get(mint);
  if (hit && Date.now() - hit.at < 120_000) return hit.p;
  const p = (async () => {
    await slot();
    try {
      const to = Date.now(), from = to - 23 * 3_600_000;
      const j = await getJson(`/tokens/${encodeURIComponent(mint)}/candles?tf=1h&from=${from}&to=${to}`);
      const c = isObj(j) && Array.isArray(j.candles) ? j.candles.flatMap((x) => (isObj(x) && num(x.c) != null && (num(x.c) as number) > 0 ? [x.c as number] : [])) : [];
      return c.length > 1 ? c : null;
    } catch { return null; } finally { release(); }
  })();
  sparkCache.set(mint, { at: Date.now(), p });
  return p;
}
