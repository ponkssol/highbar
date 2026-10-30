/** Data layer for the highbar API. Browser -> same-origin /hb-api proxy; server -> API_URL (server-only env). */
import type { TierId } from "@hb/shared";
import { STATS, TOKENS, type TokenRow, type Trade } from "./mock";

export const apiBase = () => (typeof window === "undefined" ? process.env.API_URL || "http://localhost:4000" : "/hb-api");
/** Server-side (SSR / OG image) calls straight to the API carry the shared proxy secret, so the API does not rate-limit them as one IP. Browser: none. */
export const apiHeaders = (): Record<string, string> =>
  typeof window === "undefined" && process.env.PROXY_SHARED_SECRET ? { "x-hb-proxy-secret": process.env.PROXY_SHARED_SECRET } : {};

export interface ApiToken {
  mint: string; pool: string; config: string; tier: TierId; antiSniper: boolean; creator: string; createdAt: number;
  quoteReserveSol: number; thresholdSol: number; progress: number; isMigrated: boolean; priceSol: number; mcapSol: number; mcapUsd: number;
  name: string; symbol: string; uri: string; image?: string | null; devLocked?: boolean; unlockAt?: number | null; score?: number | null; scoreLabel?: string | null; volumeSol: number; volume24hSol: number; trades: number; creatorFeesSol: number;
}
export interface ApiStats {
  totalTokens: number; graduated: number; graduatedPct: number;
  launches7d: { date: string; day: string; tokens: number; graduated: number }[]; launches30d: { date: string; day: string; tokens: number; graduated: number }[];
  totalVolumeSol: number; volumeDelta: number; creatorFeesSol: number; creatorDelta: number; barBurned: number; burnDelta: number;
  activeTraders24h: number; platformFeesSol: number;
}
export type ApiTrade = Trade & { feeSol?: number; viaUi?: boolean; devBuy?: boolean };

async function get<T>(path: string, timeoutMs = 4000): Promise<T> {
  const res = await fetch(`${apiBase()}${path}`, { cache: "no-store", headers: apiHeaders(), signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json() as Promise<T>;
}
export async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${apiBase()}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error || `${path}: ${res.status}`);
  return j as T;
}

/** API token -> table row shape used by the UI. */
export const toRow = (t: ApiToken): TokenRow & { pool: string; progress: number; isMigrated: boolean; priceSol: number } => ({
  mint: t.mint, pool: t.pool, name: t.name || t.mint.slice(0, 6), ticker: t.symbol || "?", tier: t.tier, mcapUsd: t.mcapUsd,
  raisedSol: t.quoteReserveSol, volume24hSol: t.volume24hSol, createdAt: t.createdAt, creator: t.creator, antiSniper: t.antiSniper,
  description: "", image: t.image ?? null, devLocked: !!t.devLocked, unlockAt: t.unlockAt ?? null, progress: t.progress, isMigrated: t.isMigrated, priceSol: t.priceSol,
});

export const api = {
  tokens: (q: Record<string, string | number> = {}) =>
    get<{ total: number; items: ApiToken[] }>(`/tokens?${new URLSearchParams(Object.entries(q).map(([k, v]) => [k, String(v)]))}`),
  token: (mint: string) => get<ApiToken>(`/tokens/${mint}`),
  trades: (mint: string) => get<ApiTrade[]>(`/tokens/${mint}/trades`),
  stats: () => get<ApiStats>("/stats"),
  confirmLock: (escrow: string) => post<{ ok: boolean }>("/tx/lock/confirm", { escrow }),
  health: () => get<{ ok: boolean }>("/health", 2000),
};

/** Stats in the shape the stats panel expects (mock shape), real values where available. */
export function statsView(s: ApiStats | null): typeof STATS & { live: boolean; activeTraders24h?: number } {
  if (!s) return { ...STATS, totalVolumeSol: 0, volumeDelta: 0, creatorFeesSol: 0, creatorDelta: 0, barBurned: 0, burnDelta: 0, graduatedPct: 0, graduated: 0, totalTokens: 0, newPerDay: [], live: false, activeTraders24h: 0 };
  return {
    ...STATS, live: true,
    totalVolumeSol: s.totalVolumeSol, volumeDelta: s.volumeDelta, creatorFeesSol: s.creatorFeesSol, creatorDelta: s.creatorDelta,
    barBurned: s.barBurned, burnDelta: s.burnDelta, graduatedPct: s.graduatedPct, graduated: s.graduated, totalTokens: s.totalTokens,
    newPerDay: s.launches7d.map((d) => ({ day: d.day, tokens: d.tokens, graduated: d.graduated })),
    activeTraders24h: s.activeTraders24h,
  };
}
export const MOCK_TOKENS = TOKENS;