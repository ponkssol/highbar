/** Search modal memory in localStorage: recently searched (opened from search results), recently viewed (token pages visited)
 *  and favourites (starred mints). Kept apart from lib/search.ts so the token page can record a view without the search data layer. */
export interface SavedToken { mint: string; name: string; symbol: string; image: string | null; marketCapSol: number | null; marketCapUsd: number | null; createdAt: number | null }
export type HistoryKind = "searched" | "viewed";

const KEY: Record<HistoryKind | "favs", string> = { searched: "hb-search-recent", viewed: "hb-search-viewed", favs: "hb-search-favs" };
const MAX = 20;
export const HISTORY_EVENT = "hb-search-history";

function read<T>(k: string, d: T): T {
  try { const v = JSON.parse(localStorage.getItem(k) ?? "null"); return Array.isArray(v) ? (v as T) : d; } catch { return d; }
}
function write(k: string, v: unknown) {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode or full storage: memory is best effort */ }
  window.dispatchEvent(new Event(HISTORY_EVENT));
}
const valid = (t: unknown): t is SavedToken => typeof t === "object" && t !== null && typeof (t as SavedToken).mint === "string";

export const getHistory = (kind: HistoryKind): SavedToken[] => read<unknown[]>(KEY[kind], []).filter(valid);
export function pushHistory(kind: HistoryKind, t: SavedToken) {
  const row: SavedToken = { mint: t.mint, name: t.name, symbol: t.symbol, image: t.image, marketCapSol: t.marketCapSol, marketCapUsd: t.marketCapUsd, createdAt: t.createdAt };
  write(KEY[kind], [row, ...getHistory(kind).filter((x) => x.mint !== t.mint)].slice(0, MAX));
}
export const clearHistory = (kind: HistoryKind) => write(KEY[kind], []);

export const getFavs = (): string[] => read<unknown[]>(KEY.favs, []).filter((m): m is string => typeof m === "string");
export function toggleFav(mint: string) {
  const f = getFavs();
  write(KEY.favs, f.includes(mint) ? f.filter((m) => m !== mint) : [mint, ...f].slice(0, 200));
}
