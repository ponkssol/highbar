/** Open Book: types and readers for the bookkeeping endpoints (GET /tokens/:mint/openbook, /tokens/:mint/openbook/ledger(.csv),
 *  /openbook and /openbook/tokens). Everything goes through apiBase(), never a client RPC. Every field is optional and nullable on
 *  purpose: the UI parses tolerantly and shows a missing value as muted empty text, never as a fake 0. */
import { apiBase, apiHeaders } from "./api";

export type Provenance = "exact" | "derived" | string;
type N = number | null | undefined;
type S = string | null | undefined;

export interface ObMeta { network?: S; indexState?: "pending" | "backfilling" | "synced" | "lagging" | string; indexedSlot?: N; indexedAt?: N; generatedAt?: N; maxAgeMs?: N; costsAvailable?: boolean | null; cacheAgeMs?: N }

export interface FeePart { kind?: "dbc" | "tips" | "priority" | "base" | string; sol?: N; pct?: N; provenance?: Provenance | null }
export interface SchedulePoint { offsetMs?: N; feeBps?: N }
export interface AntiSniper { portionSol?: N; pctOfDbcFees?: N; observed?: boolean | null; baseFeeBps?: N; provenance?: Provenance | null; schedule?: { mode?: S; durationMs?: N; points?: SchedulePoint[] | null } | null }
export interface SplitRow { recipient?: "meteora" | "referral" | "creator" | "platform" | string; pct?: N; sol?: N; account?: S; provenance?: Provenance | null; recipientCount?: N }
export interface Bucket { bucket?: "buyback" | "ops" | "treasury" | string; pct?: N; sol?: N; state?: "soon" | "accrued" | string; lastAt?: N; lastSig?: S; txCount?: N; account?: S; pooled?: boolean | null }
export interface DevEvent { action?: "buy" | "sell" | "lock" | "transfer" | string; wallet?: S; ts?: N; slot?: N; slotOffset?: N; offsetMs?: N; sol?: N; tokens?: N; pctSupply?: N; atomicWithCreate?: boolean | null; fromUnlocked?: boolean | null; lock?: Record<string, unknown> | null; sig?: S; escrow?: S }
export interface EarlyRow { rank?: N; wallet?: S; label?: S; tag?: "dev" | "sniper" | "early" | "bundle" | string; slot?: N; slotOffset?: N; offsetMs?: N; solIn?: N; tokens?: N; pctSupply?: N; feeSol?: N; txCount?: N; tipSol?: N; tipProviders?: string[] | null; tipProvider?: S; tipKnown?: boolean | null; sold?: boolean | null; holdsNowTokens?: N; holdsNowPct?: N; failedAttempts?: N; firstSig?: S; tokenAccount?: S }
export interface TipProvider { provider?: S; tipSol?: N; sniperTipSol?: N; txCount?: N; sniperTxCount?: N; pctOfTips?: N; sniperPct?: N }
export interface Holder { wallet?: S; label?: S; tokens?: N; pctSupply?: N; isCreator?: boolean | null }
export interface MigStep { slot?: N; ts?: N; sig?: S; pool?: S; dammPool?: S; kind?: S }

export interface TokenOpenBook {
  meta?: ObMeta | null; mint?: S; symbol?: S; name?: S; tier?: S; phase?: S;
  coverage?: { indexedTrades?: N; tokenTrades?: N; costTxs?: N; rebuiltAt?: N } | null;
  launch?: { createdAt?: N; launchSlot?: N; createSig?: S; pool?: S; config?: S; creator?: S; tier?: S; antiSniper?: boolean | null; devBuy?: { sol?: N; tokens?: N; pctSupply?: N; feeSol?: N; sig?: S } | null } | null;
  summary?: {
    volume?: { totalSol?: N; totalUsd?: N; txCount?: N; buyCount?: N; sellCount?: N; buySol?: N; sellSol?: N; provenance?: Provenance | null } | null;
    fees?: { totalSol?: N; pctOfVolume?: N; complete?: boolean | null; parts?: FeePart[] | null } | null;
    antiSniper?: AntiSniper | null;
    tips?: { totalSol?: N; providerCount?: N; txCount?: N; provenance?: Provenance | null; snipers?: { sol?: N; pct?: N; walletCount?: N; txCount?: N; avgTipPerTxSol?: N; othersAvgTipPerTxSol?: N; multiple?: N; rule?: S } | null } | null;
  } | null;
  feesSplit?: { dbcFeesSol?: N; provenance?: Provenance | null; exactTradeSharePct?: N; creatorPctOfTradingFee?: N; rows?: SplitRow[] | null } | null;
  platformFlow?: { platformShareSol?: N; platformShareProvenance?: Provenance | null; claimedSol?: N; claimedProvenance?: Provenance | null; wallet?: S; deductions?: { lpRebateSol?: N; cashbackSol?: N; cashbackProvenance?: Provenance | null } | null; netSol?: N; provenance?: Provenance | null; buckets?: Bucket[] | null } | null;
  postMigration?: { provenance?: Provenance | null; dbcTradingClaimedSol?: N; migrationFeeSol?: N; surplusSol?: N; dammLpFeesSol?: N; lpRebate?: { accruedSol?: N; paidSol?: N; paidCount?: N; lastPaidSig?: S; lastPaidAt?: N } | null; claims?: unknown[] | null } | null;
  devActivity?: { creator?: S; linkedWallets?: string[] | null; undisclosedLinkedCount?: N; boughtSol?: N; boughtTokens?: N; boughtPctSupply?: N; soldSol?: N; soldTokens?: N; soldPctSupply?: N; sellTxCount?: N; lockedPctSupply?: N; holdsPctSupply?: N; holdsInclLockedPct?: N; holdsAsOf?: N; truncated?: boolean | null; events?: DevEvent[] | null } | null;
  devLock?: Record<string, unknown> | null;
  locks?: Record<string, unknown>[] | null;
  migration?: { status?: S; quoteReserveSol?: N; thresholdSol?: N; progressPct?: N; remainingSol?: N; etaMs?: N; steps?: { poolCreated?: MigStep | null; migrated?: MigStep | null; lpLocked?: MigStep | null } | null } | null;
  earlyBuyers?: { window?: { kind?: S; value?: N } | null; createSlot?: N; total?: N; shown?: N; rows?: EarlyRow[] | null; snipers?: { walletCount?: N; pctSupplyTaken?: N; slotRange?: number[] | null; heldNowPct?: N } | null; truncated?: boolean | null; rules?: Record<string, S> | null } | null;
  tipsByProvider?: { provenance?: Provenance | null; totalSol?: N; providers?: TipProvider[] | null; largestTip?: { sol?: N; sig?: S } | null; medianTipSol?: N } | null;
  holders?: { count?: N; heldTokens?: N; top10Pct?: N; top20Pct?: N; devPct?: N; top?: Holder[] | null; asOf?: N; provenance?: Provenance | null; rule?: S } | null;
  ledger?: { total?: N; counts?: { all?: N; buys?: N; sells?: N; snipers?: N; sniperCountCapped?: boolean | null; failed?: N; duplicate?: N } | null; csv?: boolean | null } | null;
}

export interface LedgerShare { recipient?: S; pct?: N; sol?: N; account?: S; provenance?: Provenance | null }
export interface LedgerRow {
  sig?: S; ixIdx?: N; ts?: N; slot?: N; slotOffset?: N; offsetMs?: N; type?: "buy" | "sell" | string | null; wallet?: S; label?: S; sol?: N; tokenAmount?: N; viaUi?: boolean | null;
  baseFeeSol?: N; priorityFeeSol?: N; feeSol?: N; tipSol?: N; tipProviders?: string[] | null; dbcFeeSol?: N; status?: "success" | "failed" | "duplicate" | string; duplicateOf?: S; tags?: string[] | null;
  detail?: {
    network?: { feePayer?: S; signatures?: N; feeSol?: N; baseFeeSol?: N; priorityFeeSol?: N; computeUnitLimit?: N; computeUnitsConsumed?: N; cuPriceMicroLamports?: N; priorityFeeFromBudgetSol?: N; txIdx?: N; provenance?: Record<string, Provenance> | null } | null;
    err?: unknown; tips?: { provider?: S; sol?: N; account?: S }[] | null; tipsTotalSol?: N; otherTransfers?: { to?: S; sol?: N; kind?: S }[] | null; setupSol?: N; signerSolDeltaSol?: N;
    dbc?: { feeBps?: N; offsetMs?: N; slotOffset?: N; totalSol?: N; totalProvenance?: Provenance | null; shares?: LedgerShare[] | null; antiSniperSol?: N; antiSniperProvenance?: Provenance | null; baseFeeBps?: N; pricePreSol?: N; pricePostSol?: N; priceImpactPct?: N; priceProvenance?: Record<string, Provenance> | null; minOutHeadroomPct?: N } | null;
    tx?: { tokenAmount?: N; duplicates?: string[] | null } | null;
    allIn?: { costSol?: N; pctOnTop?: N; spentSol?: N } | null;
  } | null;
}
export interface LedgerPage { meta?: ObMeta | null; mint?: S; symbol?: S; filter?: Record<string, unknown> | null; total?: N; totalExact?: boolean | null; totalCap?: N; nextCursor?: S; prevCursor?: S; rows?: LedgerRow[] | null }

export type ObWindow = "all" | "30d" | "7d" | "24h";
export const OB_WINDOWS: { id: ObWindow; label: string }[] = [{ id: "all", label: "All time" }, { id: "30d", label: "30d" }, { id: "7d", label: "7d" }, { id: "24h", label: "24h" }];
export const normWindow = (w?: string | null): ObWindow => (w === "30d" || w === "7d" || w === "24h" ? w : "all");

export interface TreasuryWallet { address?: S; roles?: string[] | null; owner?: S; ownerLabel?: S; balanceSol?: N; wsolSol?: N; higherHeldTokens?: N; balanceAt?: N; slot?: N; netChange24hSol?: N; spark?: { ts?: N; balanceSol?: N }[] | null; provenance?: Provenance | null }
export interface PlatformOpenBook {
  meta?: ObMeta | null; window?: S; windowStartMs?: N; windowGranularity?: S; higherMint?: S;
  totals?: { tokensLaunched?: N; migratedCount?: N; volumeSol?: N; volumeUsd?: N; txCount?: N; feesPaidSol?: N; feesPctOfVolume?: N; dbcFeesSol?: N; dbcPctOfVolume?: N; creatorsEarnedSol?: N; creatorCount?: N; tipsSol?: N; sniperTipPct?: N; antiSniperSol?: N; provenance?: Record<string, Provenance> | null } | null;
  feeFlow?: { window?: S; tipsWindow?: S; tradersSol?: N; feeTypes?: { dbcSol?: N; tipsSol?: N; networkSol?: N } | null;
    recipients?: { meteoraSol?: N; creatorsSol?: N; platformSol?: N; referrersSol?: N; tips?: { provider?: S; sol?: N; txCount?: N; sniperSol?: N }[] | null; validatorsSol?: N; burnedBaseFeeSol?: N } | null;
    splitPct?: Record<string, N> | null; platformPctOfFees?: N; tipsPctOfFees?: N; provenance?: Provenance | null } | null;
  platformUse?: { basis?: S; periods?: N; grossSol?: N; lpRebateSol?: N; cashbackSol?: N; buybackSol?: N; opsSol?: N; treasurySol?: N; shortfallSol?: N; pct?: Record<string, N> | null; provenance?: Provenance | null } | null;
  claims?: { dbcTrading?: { sol?: N; count?: N } | null; dbcMigration?: { sol?: N; count?: N } | null; dbcSurplus?: { sol?: N; count?: N } | null; dammLp?: { sol?: N; count?: N } | null; provenance?: Provenance | null } | null;
  cashbackPaid?: { sol?: N; payouts?: N; wallets?: N; provenance?: Provenance | null } | null;
  buyback?: { status?: S; burnedTokens?: N; buybackTxCount?: N; lastSig?: S; lastAt?: N; solSpent?: N } | null;
  treasuryWallets?: TreasuryWallet[] | null;
}
export interface ObTokenRow { mint?: S; name?: S; symbol?: S; uri?: S; tier?: S; volumeSol?: N; dbcFeesSol?: N; creatorEarnedSol?: N; tipsSol?: N; sniperTipPct?: N; status?: S; progressPct?: N; pool?: S; dammPool?: S; provenance?: Record<string, Provenance> | null }
export interface ObTokensPage { meta?: ObMeta | null; total?: N; sort?: S; order?: S; nextCursor?: S; rows?: ObTokenRow[] | null }

/** Finite number or null. Never turns a missing value into 0. */
export const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() !== "" && Number.isFinite(+v) ? +v : null);
export const arr = <T,>(v: T[] | null | undefined): T[] => (Array.isArray(v) ? v : []);
export const str = (v: unknown): string | null => (typeof v === "string" && v ? v : null);

export interface LedgerFilter { wallet?: string; side?: "buy" | "sell" | null; status?: "ok" | "failed" | "duplicate" | null; sniper?: boolean }
export const ledgerQuery = (f: LedgerFilter, extra: Record<string, string | number | undefined | null> = {}) => {
  const q = new URLSearchParams();
  if (f.wallet?.trim()) q.set("wallet", f.wallet.trim());
  if (f.side) q.set("side", f.side);
  if (f.status) q.set("status", f.status);
  if (f.sniper) q.set("sniper", "1");
  for (const [k, v] of Object.entries(extra)) if (v != null && v !== "") q.set(k, String(v));
  return q.toString();
};

export class ObError extends Error { constructor(public status: number, message: string) { super(message); } }
async function obGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  const r = await fetch(`${apiBase()}${path}`, { cache: "no-store", headers: apiHeaders(), signal });
  if (!r.ok) {
    let msg = `${r.status}`;
    try { const j = await r.json(); if (j && typeof j.error === "string") msg = j.error; } catch { /* not json */ }
    throw new ObError(r.status, msg);
  }
  return r.json() as Promise<T>;
}
const enc = encodeURIComponent;
export const fetchTokenOpenBook = (mint: string, signal?: AbortSignal) => obGet<TokenOpenBook>(`/tokens/${enc(mint)}/openbook`, signal);
export const fetchLedger = (mint: string, f: LedgerFilter, cursor: string | null, limit = 25, signal?: AbortSignal) =>
  obGet<LedgerPage>(`/tokens/${enc(mint)}/openbook/ledger?${ledgerQuery(f, { limit, cursor })}`, signal);
export const ledgerCsvUrl = (mint: string, f: LedgerFilter) => { const q = ledgerQuery(f); return `${apiBase()}/tokens/${enc(mint)}/openbook/ledger.csv${q ? `?${q}` : ""}`; };
export const fetchPlatformOpenBook = (w: ObWindow, signal?: AbortSignal) => obGet<PlatformOpenBook>(`/openbook?window=${w}`, signal);
export interface TokensQuery { q?: string; status?: "all" | "bonding" | "migrated"; sort?: string; order?: "asc" | "desc"; cursor?: string | null; limit?: number }
export const tokensQueryString = (o: TokensQuery) => {
  const q = new URLSearchParams();
  if (o.q?.trim()) q.set("q", o.q.trim());
  if (o.status && o.status !== "all") q.set("status", o.status);
  if (o.sort) q.set("sort", o.sort);
  if (o.order) q.set("order", o.order);
  if (o.limit) q.set("limit", String(o.limit));
  if (o.cursor) q.set("cursor", o.cursor);
  return q.toString();
};
export const fetchObTokens = (o: TokensQuery, signal?: AbortSignal) => obGet<ObTokensPage>(`/openbook/tokens?${tokensQueryString(o)}`, signal);

/** Display names. Bucket and recipient ids come from the API, only the words are ours. */
export const RECIPIENT_LABEL: Record<string, string> = { meteora: "Meteora protocol", creator: "Creator", platform: "Platform", referral: "Referral" };
export const BUCKET_LABEL: Record<string, string> = { buyback: "Buyback", ops: "Ops", treasury: "Treasury" };
export const FEE_KIND_LABEL: Record<string, string> = { dbc: "DBC trading fees", tips: "Tips to block engines", priority: "Priority fees", base: "Network base fees" };
const PROVIDER: Record<string, string> = { jito: "Jito", nozomi: "Nozomi", bloxroute: "bloXroute", "lunar-lander": "Lunar Lander", "unknown-tip": "Unknown tip account", nextblock: "NextBlock", astralane: "Astralane", temporal: "Temporal", "0slot": "0slot", helius: "Helius", others: "Others" };
export const providerLabel = (p?: string | null) => (!p ? "Unknown" : PROVIDER[p.toLowerCase()] ?? p.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()));
