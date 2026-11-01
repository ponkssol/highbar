/** Messages between extension pages / the x.com content script and the background worker. Keys never leave the worker:
 *  no response type below carries a secret except wallet:export / wallet:create (backup), which only extension pages may call. */
import type { CandleReply, ChartSource, Res as ChartRes } from "./candles";
import type { LaunchTier, Presets, Settings } from "./settings";
import type { LaunchDraft } from "./tweet";
import type { ClaimRes, QuoteRes } from "./api";
import type { MultiRow } from "./multi";
import type { HoldRow } from "./holding";
import type { SellStep } from "./sell";
import type { CaInfo, CaHit, PillStats } from "./ca";
import type { TokenAudit } from "./audit";
import type { LedgerEntry } from "./ledger";
/** The PnL card: the selected wallet's balance of the token, its ledger entries and SOL/USD. */
export interface CaPosition { walletId: string; label: string; balanceRaw: string; decimals: number; solUsd: number | null; entries: LedgerEntry[] }

export interface WalletStatus {
  /** ready: the wallet can sign (no lock). needsMigration: a wallet from before the no-password update, waiting for its old password once. */
  exists: boolean; ready: boolean; needsMigration: boolean; address: string | null; kind: "key" | "mnemonic" | null;
  network: "mainnet" | "devnet" | null; siteUrl: string; presets: Presets; dedicatedAck: boolean;
  /** The active wallet (Portfolio, Create history, Fees and Settings follow it) and how many wallets there are. */
  walletId: string | null; label: string | null; walletCount: number;
  /** Settings > Token detection on x.com. */
  caDetect: boolean;
}
/** One row of the wallet list. No key material. `sol` is null when the balance could not be read (RPC down or rate limited). */
export interface WalletRow { id: string; label: string; address: string; kind: "key" | "mnemonic"; createdAt: number; active: boolean; needsMigration: boolean; sol: number | null }
export interface Holding { mint: string; amount: number; name: string | null; symbol: string | null; image: string | null; valueSol: number | null; program: "spl" | "t22" }
export interface Portfolio { sol: number; tokens: Holding[]; updatedAt: number }
export type HistoryStatus = "pending" | "confirmed" | "failed";
export interface HistoryItem { id: string; at: number; name: string; ticker: string; tier: string; devBuySol: number; tweetUrl: string | null; image: string | null;
  status: HistoryStatus; mint: string | null; signature: string | null; error: string | null; mcapUsd?: number; source: "local" | "api" | "both" }
export interface LaunchOpts { tier: LaunchTier; antiSniper: boolean; devBuySol: number; slippageBps: number; description: string }
/** What the Settings RPC card shows. The server RPC's upstream URL is never part of it (it stays on the server). */
export interface RpcStatus { mode: "server" | "custom"; customUrl: string | null; ok: boolean; message: string | null; slot?: number;
  /** Short technical reason when it failed (HTTP status, timeout, network error) and when it was checked (ms). */
  detail?: string | null; checkedAt?: number }
export type LaunchStep = "image" | "metadata" | "mint" | "sign" | "cosign" | "send" | "confirm" | "done";
export interface LaunchDone { mint: string; signature: string; tokenUrl: string; solscanUrl: string }

export type Req =
  | { type: "status" }
  | { type: "wallet:create"; words: 12 | 24; label?: string }
  | { type: "wallet:import"; input: string; label?: string }
  | { type: "wallet:migrate"; password: string; id?: string }
  | { type: "wallet:export"; confirm: true; id: string }
  | { type: "wallet:remove"; confirm: true; id: string }
  | { type: "wallet:rename"; id: string; label: string }
  | { type: "wallet:select"; id: string }
  /** Labels, addresses and (with balances) SOL. Allowed from the content script for the drawer wallet picker. */
  | { type: "wallets:list"; balances?: boolean; fresh?: boolean }
  /** The wallets checked in the drawer (at least one while a wallet exists, falls back to the active wallet). */
  | { type: "drawer:wallets:get" }
  | { type: "drawer:wallets:set"; ids: string[] }
  /** The drawer anti-sniper switch, kept as the preset. */
  | { type: "drawer:antisniper:set"; on: boolean }
  /** The dev buy chip amounts (hb.devBuyPresets). null resets to the defaults. */
  | { type: "drawer:devpresets:get" }
  | { type: "drawer:devpresets:set"; values: number[] | null }
  | { type: "settings:get" }
  | { type: "settings:set"; patch: Partial<Omit<Settings, "presets">> & { presets?: Partial<Presets> } }
  | { type: "referral:bind"; referrer: string }
  | { type: "portfolio" }
  | { type: "history" }
  | { type: "fees" }
  | { type: "fees:claim"; pool: string; kind: "trading" | "migration" | "lp"; position?: string }
  | { type: "quote"; tier: LaunchTier; antiSniper: boolean; devBuySol: number; slippageBps: number }
  | { type: "rpc:status" }
  | { type: "rpc:set"; url: string | null }
  | { type: "open:sidepanel" }
  | { type: "drawer:pos:get" }
  | { type: "drawer:pos:set"; pos: { left: number; top: number } | null }
  /** Holding panel rows for these wallets (ids, checked in the drawer or one picked). No key material in the answer. */
  | { type: "holding"; walletIds: string[]; fresh?: boolean }
  | { type: "holding:prefs:get" }
  | { type: "holding:prefs:set"; open?: boolean; filter?: string | null; slippagePct?: number }
  /** CA popup. ca:check: which of these addresses (from tweet text or links) are token mints; a link address that is a pool
   *  resolves to its token. ca:ticker: a $TICKER to one mint when that is unambiguous (else null). ca:info: the popup data. */
  | { type: "ca:check"; items: { addr: string; link?: boolean }[] }
  | { type: "ca:ticker"; symbol: string }
  | { type: "ca:info"; mint: string; fresh?: boolean }
  | { type: "ca:prefs:get" }
  | { type: "ca:prefs:set"; slippagePct?: number; tab?: "buy" | "sell" }
  | { type: "ca:pos:get" }
  | { type: "ca:pos:set"; pos: { left: number; top: number } | null }
  /** chart.html: candles for the popup chart (highbar api, pump.fun or GeckoTerminal, whichever has the token). */
  | { type: "ca:candles"; mint: string; pool?: string | null; highbar?: boolean; res: ChartRes; count?: number; source?: ChartSource | null; auto?: boolean; pump?: boolean; before?: number }
  /** ca:live: the open popup's header numbers (price, market cap, 24h volume, liquidity), polled every second while it is open.
   *  ca:prefetch: tweets with a token button came into view, warm the cache (batched, throttled). diag:sources: Settings >
   *  Diagnostics, one request to each market data source. */
  | { type: "ca:live"; mint: string }
  | { type: "ca:prefetch"; mints: string[]; full?: boolean }
  | { type: "ca:stats"; mints: string[] }
  | { type: "ca:audit"; mint: string }
  | { type: "ca:position"; walletId: string; mint: string }
  | { type: "diag:sources" };

export type Res<T extends Req["type"]> =
  T extends "status" ? WalletStatus :
  T extends "wallet:create" ? { id: string; address: string; mnemonic: string } :
  T extends "wallet:import" ? { id: string; address: string } :
  T extends "wallet:migrate" ? { id: string; address: string } :
  T extends "wallets:list" ? WalletRow[] :
  T extends "drawer:wallets:get" ? { ids: string[] } :
  T extends "drawer:wallets:set" ? { ids: string[] } :
  T extends "drawer:antisniper:set" ? { on: boolean } :
  T extends "drawer:devpresets:get" ? { values: number[] } :
  T extends "drawer:devpresets:set" ? { values: number[] } :
  T extends "rpc:status" ? RpcStatus :
  T extends "rpc:set" ? RpcStatus :
  T extends "wallet:export" ? { privateKey: string; mnemonic: string | null } :
  T extends "settings:get" ? Settings :
  T extends "settings:set" ? Settings :
  T extends "referral:bind" ? { referrer: string; created: boolean } :
  T extends "portfolio" ? Portfolio :
  T extends "history" ? HistoryItem[] :
  T extends "fees" ? ClaimRes :
  T extends "fees:claim" ? { signature: string; solscanUrl: string } :
  T extends "quote" ? QuoteRes :
  T extends "drawer:pos:get" ? { left: number; top: number } | null :
  T extends "holding" ? HoldingRes :
  T extends "holding:prefs:get" ? HoldPrefs :
  T extends "holding:prefs:set" ? HoldPrefs :
  T extends "ca:check" ? Record<string, string | null> :
  T extends "ca:ticker" ? CaHit | null :
  T extends "ca:info" ? CaInfo :
  T extends "ca:prefs:get" ? CaPrefs :
  T extends "ca:prefs:set" ? CaPrefs :
  T extends "ca:pos:get" ? { left: number; top: number } | null :
  T extends "ca:candles" ? CandleReply :
  T extends "ca:live" ? LiveStats :
  T extends "ca:prefetch" ? { ok: true } :
  T extends "ca:stats" ? PillStats[] :
  T extends "ca:audit" ? TokenAudit :
  T extends "ca:position" ? CaPosition :
  T extends "diag:sources" ? DiagResult[] :
  { ok: true };

export type Reply<T> = { ok: true; data: T } | { ok: false; error: string; code?: string };

/** Launch runs over a port (name "launch") so the drawer gets each step. */
/** `walletId` names the wallet that creates and signs (the drawer picker). Missing means the active wallet.
 *  `walletIds` with two or more ids is a multi create: one separate token per wallet, each signed only by that wallet. */
export type LaunchPortIn = { type: "start"; draft: LaunchDraft; opts: LaunchOpts; imageDataUrl?: string | null; walletId?: string | null; walletIds?: string[] };
export type LaunchPortOut = { type: "step"; step: LaunchStep } | { type: "done"; result: LaunchDone } | { type: "error"; error: string; code?: string }
  | { type: "multi"; rows: MultiRow[] } | { type: "multi:done"; rows: MultiRow[] };

/** Holding panel. `rpcMode` server means sells need the server RPC to allow simulateTransaction (or a custom RPC). */
export interface HoldingRes { rows: HoldRow[]; walletIds: string[]; rpcMode: "server" | "custom"; network: "mainnet" | "devnet"; pollMs: number; updatedAt: number; errors: string[] }
/** open and filter live in session storage, the slippage in local storage. filter null = all checked wallets. */
export interface HoldPrefs { open: boolean; filter: string | null; slippagePct: number }
/** Sell runs over a port (name "sell"): the content script sends what to sell, the worker builds, checks, signs, simulates and sends. */
export type SellPortIn = { type: "sell"; walletId: string; mint: string; pct: number; slippagePct: number; side?: "buy" | "sell"; sol?: number };
export type SellPortOut = { type: "step"; step: SellStep } | { type: "done"; signature: string; solscanUrl: string; amountRaw: string; route?: string } | { type: "error"; error: string; code?: string };

/** CA popup prefs (local storage): the slippage for its swaps and the last tab. */
export interface CaPrefs { slippagePct: number; tab: "buy" | "sell" }

/** Worker -> content script. */
export type ToContent = { type: "hotkey:launch" } | { type: "status:changed" };

export async function send<T extends Req>(req: T): Promise<Res<T["type"]>> {
  const r = (await chrome.runtime.sendMessage(req)) as Reply<Res<T["type"]>> | undefined;
  if (!r) throw new Error("The extension worker did not answer. Reload the extension.");
  if (!r.ok) { const e = new Error(r.error) as Error & { code?: string }; e.code = r.code; throw e; }
  return r.data;
}

/** Live header numbers for the CA popup (ca:live). */
export interface LiveStats { mint: string; priceUsd: number | null; priceAt: number | null; source: "pump.fun" | "jupiter" | "dexscreener" | null;
  mcapUsd: number | null; change24h: number | null; volume24hUsd: number | null; liquidityUsd: number | null; at: number }
/** One line of Settings > Diagnostics. */
export interface DiagResult { name: string; url: string; ok: boolean; status: number | null; ms: number; note: string }
