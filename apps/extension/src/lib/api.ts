/** highbar API client (background worker and extension pages only: content scripts are x.com origin and must message the worker). */
export class ApiError extends Error { constructor(message: string, readonly status: number) { super(message); this.name = "ApiError"; } }

async function call<T>(base: string, path: string, init?: RequestInit, timeoutMs = 20_000): Promise<T> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  let r: Response;
  try { r = await fetch(`${base}${path}`, { ...init, signal: ctl.signal, cache: "no-store" }); }
  catch { throw new ApiError("Could not reach highbar. Check your connection and try again.", 0); }
  finally { clearTimeout(t); }
  const j = await r.json().catch(() => null);
  if (!r.ok) throw new ApiError(typeof j?.error === "string" ? j.error : `Request failed (${r.status})`, r.status);
  return j as T;
}

export interface ApiConfig { network: "mainnet" | "devnet"; siteUrl: string }
export interface MetadataRes { uri: string; image?: string }
export interface LaunchRes { tx: string; size: number; mint: string; pool: string; vanity?: boolean; mintSource?: "pool" | "random" | "random-fallback"; devBuy: unknown }
export interface QuoteRes { devBuySol: number; estTokens: number; minTokens: number; supplyPct: number; feeSol: number; feePct: number; minFeeApplied: boolean; thresholdSol: number; maxDevBuySol: number }
export interface CreatedToken { mint: string; pool: string; tier: string; name: string; symbol: string; createdAt: number; mcapSol: number; mcapUsd: number; isMigrated: boolean; progress: number; uri: string; priceSol?: number }
export interface TokenView { mint: string; name: string; symbol: string; mcapSol: number; mcapUsd: number; priceSol: number; image?: string | null; tier: string; pool?: string; isMigrated?: boolean }
/** GET /wallet/:a/trades (the fields the Holding panel reads). */
export interface TradeLite { mint: string; side: "buy" | "sell"; sol: number; ts: number; devBuy?: boolean }
/** POST /tx/swap: the DBC swap2 the web trade panel uses, unsigned, fee payer = owner. */
export interface SwapRes { tx: string; minimumAmountOut: string }
export interface OpenBookLite { migration?: { status?: string; steps?: { migrated?: { dammPool?: string | null } | null } } }
export interface ClaimRow { mint: string; pool: string; name: string; symbol: string; tier: string; image: string | null; migrated: boolean; tradingFeeSol: number; migrationFeeSol: number; lpFeeSol: number;
  lp: { dammPool: string | null; positions: { dammPool: string; position: string; unclaimedSol: number }[] } | null; error: string | null }
export interface ClaimRes { creator: string; tokens: ClaimRow[]; totalSol: number; updatedAt: number }

export function api(base: string) {
  const get = <T>(p: string) => call<T>(base, p);
  const post = <T>(p: string, body: unknown, headers: Record<string, string> = {}) => call<T>(base, p, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
  return {
    get, post,
    config: () => get<ApiConfig>("/config"),
    metadata: (b: { name: string; symbol: string; description: string; twitter?: string; website?: string; telegram?: string; image?: string }) => post<MetadataRes>("/metadata", b),
    quote: (tier: string, antiSniper: boolean, devBuySol: number, slippageBps: number) => get<QuoteRes>(`/tx/launch/quote?tier=${encodeURIComponent(tier)}&antiSniper=${antiSniper}&devBuySol=${devBuySol}&slippageBps=${slippageBps}`),
    launch: (b: { creator: string; name: string; symbol: string; uri: string; tier: string; antiSniper: boolean; devBuySol: number; slippageBps: number }) => post<LaunchRes>("/tx/launch", b),
    cosign: (mint: string, tx: string) => post<{ tx: string; mint: string; pool: string; signature: string }>("/tx/launch/sign", { mint, tx }),
    confirmMint: (mint: string, signature: string) => post<{ used: boolean }>("/mint/confirm", { mint, signature }),
    created: (a: string) => get<CreatedToken[]>(`/wallet/${a}/created`),
    token: (mint: string) => get<TokenView>(`/tokens/${mint}`),
    trades: (a: string) => get<TradeLite[]>(`/wallet/${a}/trades`),
    openbook: (mint: string) => get<OpenBookLite>(`/tokens/${mint}/openbook`),
    swap: (b: { owner: string; pool: string; side: "buy" | "sell"; amount: string; slippageBps: number }) => post<SwapRes>("/tx/swap", b),
    claims: (a: string) => get<ClaimRes>(`/claim/${a}`),
    claimBuild: (b: { creator: string; pool: string; kind: "trading" | "migration" | "lp"; position?: string }) => post<{ tx: string }>("/claim/build", b),
    nonce: (a: string) => get<{ nonce: string; expiresAt: number }>(`/auth/nonce?address=${a}`),
    verify: (b: { address: string; message: string; signature: string }) => post<{ token: string; exp: number }>("/auth/verify", b),
    bindReferral: (token: string, referrer: string) => post<{ ok: boolean; referrer: string; created?: boolean }>("/referrals", { referrer, source: "manual" }, { authorization: `Bearer ${token}` }),
    referralOf: (a: string) => get<{ referredBy: string | null }>(`/referrals/${a}`),
  };
}
export type Api = ReturnType<typeof api>;
