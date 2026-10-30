/** Server-side API reads cached for about a minute (Next data cache), shared by pages, generateMetadata, the sitemap and the
 *  llms / tokens.md routes. Failures throw inside the cache so they are never stored; callers get null instead. */
import { unstable_cache } from "next/cache";
import { apiBase, apiHeaders, type ApiStats, type ApiToken, type ApiTrade } from "./api";
import type { LockView } from "./lockData";
import type { ObTokensPage, ObWindow, PlatformOpenBook } from "./openbook";

export const REVALIDATE_S = 60;

async function getJson<T>(path: string, timeoutMs = 6000): Promise<T> {
  const r = await fetch(`${apiBase()}${path}`, { cache: "no-store", headers: apiHeaders(), signal: AbortSignal.timeout(timeoutMs) });
  if (r.status === 404) throw Object.assign(new Error("not found"), { notFound: true });
  if (!r.ok) throw new Error(`${path}: ${r.status}`);
  return r.json() as Promise<T>;
}
const cached = <A extends unknown[], T>(key: string, fn: (...a: A) => Promise<T>) =>
  unstable_cache(fn, [`hb-seo-${key}`], { revalidate: REVALIDATE_S, tags: [`hb-${key}`] });
const orNull = <A extends unknown[], T>(fn: (...a: A) => Promise<T>) => (...a: A): Promise<T | null> => fn(...a).catch(() => null);

export interface ScoreResp { mint: string; score: number | null; label: string | null; breakdown: { holders: number; top10Pct: number } | null; updatedAt: number | null }

export const getToken = orNull(cached("token", (mint: string) => getJson<ApiToken>(`/tokens/${encodeURIComponent(mint)}`)));
export const getTrades = orNull(cached("trades", (mint: string) => getJson<ApiTrade[]>(`/tokens/${encodeURIComponent(mint)}/trades`)));
/** breakdown.holders is the API's live holder count (net curve balance above 0.000001 tokens; the creator counts while locked). */
export const getScore = orNull(cached("score", (mint: string) => getJson<ScoreResp>(`/tokens/${encodeURIComponent(mint)}/score`)));
/** First page of the home token table (same query as useTokens). */
export const getHomeTokens = orNull(cached("tokens-home", () => getJson<{ total: number; items: ApiToken[] }>("/tokens?limit=200")));
export const getStats = orNull(cached("stats", () => getJson<ApiStats>("/stats")));
export const getLock = orNull(cached("lock", (id: string) => getJson<LockView>(`/locks/${encodeURIComponent(id)}`)));
/** Open Book platform totals for one window, and the first page of its token table (optionally searched). */
export const getOpenBook = orNull(cached("openbook", (w: ObWindow) => getJson<PlatformOpenBook>(`/openbook?window=${w}`)));
export const getOpenBookTokens = orNull(cached("openbook-tokens", (q: string) => getJson<ObTokensPage>(`/openbook/tokens?limit=25${q ? `&q=${encodeURIComponent(q)}` : ""}`)));

/** Every token (paged through /tokens), newest first. Null when the API is down. */
export const getAllTokens = orNull(cached("tokens-all", async () => {
  const out: ApiToken[] = [];
  for (let page = 0; page < 100; page++) {
    const r = await getJson<{ total: number; items: ApiToken[] }>(`/tokens?limit=200&offset=${page * 200}&sort=createdAt&order=desc`, 10_000);
    out.push(...r.items);
    if (r.items.length < 200 || out.length >= r.total) break;
  }
  return out;
}));
/** Every lock (paged through /locks). */
export const getAllLocks = orNull(cached("locks-all", async () => {
  const out: LockView[] = [];
  for (let page = 1; page <= 100; page++) {
    const r = await getJson<{ total: number; items: LockView[] }>(`/locks?limit=100&page=${page}`, 10_000);
    out.push(...r.items);
    if (r.items.length < 100 || out.length >= r.total) break;
  }
  return out;
}));
