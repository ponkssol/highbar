/** Background service worker: holds the wallet, signs, talks to the API and the RPC. Content scripts and pages only send requests. */
import { AddressLookupTableAccount, Connection, PublicKey, Transaction, type Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import nacl from "tweetnacl";
import { api, type ApiConfig } from "../lib/api";
import { b64, unb64, utf8 } from "../lib/bytes";
import { KeyMismatch, WrongPassword } from "../lib/crypto";
import { solscan } from "../lib/format";
import type { CaPrefs, HeldToken, HistoryItem, HoldingRes, HoldPrefs, LaunchDone, LaunchPortIn, LaunchPortOut, LaunchStep, Portfolio, Req, Reply, RpcStatus, SellPortIn, SellPortOut, WalletRow, WalletStatus } from "../lib/messages";
import { CUSTOM_RPC_DOWN, GENESIS, rpc, RpcError, sendAndConfirm, SERVER_RPC_DOWN, TOKEN_2022, TOKEN_PROGRAM, type Rpc } from "../lib/rpc";
import { checkDevPresets, readDevPresets } from "../lib/devpresets";
import { API_BASE, cleanRpcUrl, DEFAULT_SITE, LAUNCH_TIERS, normalizeSettings, rpcEndpoint, type Settings } from "../lib/settings";
import { readPos } from "../lib/place";
import { cleanLabel, normalizeXLink, NAME_MAX_BYTES, TICKER_MAX_BYTES } from "../lib/tweet";
import { addLaunchFee, checkClaimTx, checkCosigned, checkLaunchTx, launchDevBuyLamports, TxCheckFailed } from "../lib/txcheck";
import { feeInfo, launchFee, readExtFee, type ExtFee, cacheExtFee } from "../lib/fee";
import { checkDataUrl, imageUrlToDataUrl, resolveImage, tokenThumb } from "./image";
import * as W from "./wallet";
import { readReferrals } from "../lib/wallets";
import { launchNeedSol, MULTI_MAX, readChecked, runMulti, type MultiRow } from "../lib/multi";
import { ApiError, type CreatedToken, type TokenView, type TradeLite } from "../lib/api";
import { buildRows, cleanSlippage, pollMs, rawToUi, slippageBps, type Bal } from "../lib/holding";
import { isPubkey } from "../lib/ca";
import { ata, runBuy, runSell, SellAborted, type BuildArgs, type SellDeps } from "../lib/sell";
import { buildDammBuy, buildDammSell } from "../lib/damm";
import { caService, gate } from "./ca";
import { candleService } from "./candles";
import { diagSources } from "./diag";
import { CU_LIMIT, PRIORITY_MAX_SOL, priorityLamports, setLegacyBudget } from "../lib/priority";
import { JUP_BASES, quotePath, runJupBuy, runJupSell, swapBody, type JupDeps, type JupQuote } from "../lib/jup";
import { cleanCaSlippage, CA_SLIPPAGE_DEFAULT } from "../lib/caprefs";
import { addEntry, LEDGER_KEY, readLedger } from "../lib/ledger";
import { publicTradeError } from "../lib/tradeerr";
import { JUP_PRICE } from "./candles";
import { memo, timer } from "../lib/memo";

// ---- trade speed: short caches shared by the warm-up (trade:warm) and the click ----
/** Pool route per mint (30 s: a migration flips it, and the build re-checks the pool on chain). */
const targetC = memo<{ route: "dbc" | "damm"; pool: string }>(30_000);
/** A recent blockhash (20 s of its ~60 s life) for txs built locally (DAMM v2). */
const hashC = memo<string>(20_000, 4);
/** Jupiter quotes per exact request (2.5 s: the price moves, slippage covers the rest). */
const quoteC = memo<JupQuote>(2500, 40);

const SETTINGS = "hb.settings", HISTORY = "hb.history", REFERRAL = "hb.referral", CONFIG = "hb.config";
/** Last dragged drawer position, session storage only (gone when the browser closes). The content script reaches it through the worker. */
const DRAWER_POS = "hb.drawerPos";
/** The wallets checked in the drawer (ids, no key material). Replaces the single "hb.drawerWallet" pick, migrated on read. */
const DRAWER_WALLETS = "hb.drawerWallets", DRAWER_WALLET_OLD = "hb.drawerWallet";
/** Holding panel: open and wallet filter for the session, the sell slippage kept. */
const HOLD_UI = "hb.holdingUi", SELL_SLIPPAGE = "hb.sellSlippage";
/** CA popup: slippage and last tab (local), last dragged position (session). */
const CA_PREFS = "hb.caPrefs", CA_POS = "hb.caPos";
/** The dev buy chips in the drawer (up to 4 SOL amounts). */
const DEV_PRESETS = "hb.devBuyPresets";
const PAGE_ONLY = new Set<Req["type"]>(["wallet:create", "wallet:import", "wallet:migrate", "wallet:export", "wallet:remove", "wallet:rename", "wallet:select",
  "settings:get", "settings:set", "referral:bind", "portfolio", "history", "fees", "fees:claim", "rpc:set"]);

async function settings(): Promise<Settings> { return normalizeSettings((await chrome.storage.local.get(SETTINGS))[SETTINGS] as Partial<Settings> | undefined); }
/** The custom RPC when one is set (balances, token reads and sends all use it), else the highbar server RPC. */
const rpcFor = (s: Settings): Rpc => rpc(rpcEndpoint(s), s.rpcUrl ? CUSTOM_RPC_DOWN : SERVER_RPC_DOWN);
const A0 = () => api(API_BASE);

async function config(s: Settings): Promise<ApiConfig | null> {
  const c = (await chrome.storage.local.get(CONFIG))[CONFIG] as { base: string; at: number; v: ApiConfig } | undefined;
  if (c && c.base === API_BASE && Date.now() - c.at < 10 * 60_000) return c.v;
  try {
    const v = await A0().config();
    // extFee: the highbar fee receiver comes from the API only; missing / disabled / malformed = no fee
    const clean: ApiConfig = { network: v.network === "mainnet" ? "mainnet" : "devnet", siteUrl: /^https:\/\//.test(v.siteUrl) ? v.siteUrl.replace(/\/$/, "") : DEFAULT_SITE, extFee: cacheExtFee(v.extFee) };
    await chrome.storage.local.set({ [CONFIG]: { base: API_BASE, at: Date.now(), v: clean } });
    return clean;
  } catch { return c?.base === API_BASE ? c.v : null; }
}

/** The highbar fee config (GET /config extFee, cached with the config). null = no fee, as with an API that has no extFee. */
async function extFee(s: Settings): Promise<ExtFee | null> { return readExtFee((await config(s))?.extFee); }

async function status(): Promise<WalletStatus> {
  const [all, s] = await Promise.all([W.list(), settings()]);
  const cfg = await config(s);
  const v = all.find((w) => w.active) ?? null;
  const migrate = !!v?.needsMigration;
  return { exists: !!v, ready: !!v && !migrate, needsMigration: migrate, address: v?.address ?? null, kind: v?.kind ?? null, network: cfg?.network ?? null, siteUrl: cfg?.siteUrl ?? DEFAULT_SITE,
    presets: s.presets, dedicatedAck: s.dedicatedAck, walletId: v?.id ?? null, label: v?.label ?? null, walletCount: all.length, caDetect: s.caDetect };
}

// ---- wallet list: balances are read one wallet at a time and kept 20 seconds, so a long list stays under the /rpc rate limit ----
const balCache = new Map<string, { sol: number; at: number; rpc: string }>();
async function walletRows(withBalances: boolean, fresh = false): Promise<WalletRow[]> {
  const all = await W.list();
  if (!withBalances) return all.map((w) => ({ ...w, sol: balCache.get(w.address)?.sol ?? null }));
  const s = await settings(), endpoint = rpcEndpoint(s), R = rpc(endpoint, s.rpcUrl ? CUSTOM_RPC_DOWN : SERVER_RPC_DOWN, 8000);
  const out: WalletRow[] = [];
  for (const w of all) {
    const c = balCache.get(w.address);
    let sol: number | null = !fresh && c && c.rpc === endpoint && Date.now() - c.at < 20_000 ? c.sol : null;
    if (sol === null) {
      sol = await R.balance(w.address).then((l) => l / 1e9).catch(() => c?.sol ?? null);
      if (sol !== null) balCache.set(w.address, { sol, at: Date.now(), rpc: endpoint });
    }
    out.push({ ...w, sol });
  }
  return out;
}
async function drawerWallets(): Promise<string[]> {
  const r = await chrome.storage.local.get([DRAWER_WALLETS, DRAWER_WALLET_OLD]);
  const all = await W.list();
  const ids = readChecked(r[DRAWER_WALLETS], r[DRAWER_WALLET_OLD], all.map((w) => w.id), all.find((w) => w.active)?.id ?? null);
  if (DRAWER_WALLET_OLD in r) { await chrome.storage.local.set({ [DRAWER_WALLETS]: ids }); await chrome.storage.local.remove(DRAWER_WALLET_OLD); }
  return ids;
}
async function setDrawerWallets(ids: unknown): Promise<string[]> {
  const all = await W.list();
  const clean = Array.isArray(ids) ? readChecked(ids.slice(0, MULTI_MAX), null, all.map((w) => w.id), null) : [];
  if (!clean.length) throw new Error("Check at least one wallet");
  await chrome.storage.local.set({ [DRAWER_WALLETS]: clean }); await chrome.storage.local.remove(DRAWER_WALLET_OLD);
  return clean;
}

async function broadcast() {
  chrome.runtime.sendMessage({ type: "status:changed" }).catch(() => {});
  const tabs = await chrome.tabs.query({ url: ["https://x.com/*", "https://twitter.com/*"] }).catch(() => []);
  for (const t of tabs) if (t.id !== undefined) chrome.tabs.sendMessage(t.id, { type: "status:changed" }).catch(() => {});
}

// ---- RPC: the server RPC by default, a custom URL when the user sets one (checked before it is saved) ----
/** Always a fresh probe (nothing cached). One retry after 1.5 seconds before it reports a failure, so a single slow or
 *  rate limited answer does not show Unavailable. */
async function checkRpc(s: Settings): Promise<RpcStatus> {
  const first = await probeRpc(s);
  if (first.ok || first.message?.startsWith("That RPC is not on")) return first;
  await new Promise((r) => setTimeout(r, 1500));
  return probeRpc(s);
}
async function probeRpc(s: Settings): Promise<RpcStatus> {
  const custom = s.rpcUrl || null;
  const R = rpc(rpcEndpoint(s), custom ? CUSTOM_RPC_DOWN : SERVER_RPC_DOWN, 8000);
  const checkedAt = Date.now();
  try {
    const net = (await config(s))?.network;
    if (custom && net) {
      const g = await R.genesisHash().catch(() => null);
      if (g && g !== GENESIS[net]) return { mode: "custom", customUrl: custom, ok: false, message: `That RPC is not on Solana ${net === "mainnet" ? "mainnet" : "devnet"}, which highbar uses`, detail: "Genesis hash does not match", checkedAt };
    }
    await R.latestBlockhash();
    return { mode: custom ? "custom" : "server", customUrl: custom, ok: true, message: null, detail: null, checkedAt };
  } catch (e) { return { mode: custom ? "custom" : "server", customUrl: custom, ok: false, message: (e as Error).message, detail: e instanceof RpcError ? e.detail ?? null : null, checkedAt }; }
}
/** Saves a custom RPC only when it answers (and is on the right network). Otherwise it stays on (or goes back to) the server RPC. */
async function setRpc(url: string | null, s: Settings): Promise<RpcStatus> {
  const save = async (rpcUrl: string) => { const next = normalizeSettings({ ...s, rpcUrl }); await chrome.storage.local.set({ [SETTINGS]: next }); return next; };
  if (url === null || url.trim() === "") return checkRpc(await save(""));
  const clean = cleanRpcUrl(url);
  if (!clean) throw new Error("Use an https:// RPC URL (http only for localhost), with no user name or password in it");
  const r = await checkRpc({ ...s, rpcUrl: clean });
  if (!r.ok) { await save(""); return { mode: "server", customUrl: null, ok: false, message: `${r.message?.startsWith("That RPC") ? r.message : "That RPC did not answer"}. Still using the highbar server RPC`, detail: r.detail ?? null, checkedAt: r.checkedAt }; }
  await save(clean);
  return r;
}

// ---- history (local launches, merged with GET /wallet/:a/created) ----
async function localHistory(address: string): Promise<HistoryItem[]> {
  const all = ((await chrome.storage.local.get(HISTORY))[HISTORY] ?? {}) as Record<string, HistoryItem[]>;
  return all[address] ?? [];
}
/** Writes go one at a time (a multi create writes for several wallets close together). */
let histQ: Promise<unknown> = Promise.resolve();
function putHistory(address: string, item: HistoryItem): Promise<void> {
  const snap = { ...item };
  const run = histQ.then(() => putHistoryNow(address, snap));
  histQ = run.catch(() => {});
  return run;
}
async function putHistoryNow(address: string, item: HistoryItem) {
  const all = ((await chrome.storage.local.get(HISTORY))[HISTORY] ?? {}) as Record<string, HistoryItem[]>;
  const list = (all[address] ?? []).filter((x) => x.id !== item.id);
  list.unshift(item);
  all[address] = list.slice(0, 200);
  await chrome.storage.local.set({ [HISTORY]: all });
}

async function history(): Promise<HistoryItem[]> {
  const v = await W.active();
  if (!v) return [];
  const local = await localHistory(v.address);
  const remote = await A0().created(v.address).catch(() => []);
  const byMint = new Map(local.filter((x) => x.mint).map((x) => [x.mint!, x]));
  const merged: HistoryItem[] = local.filter((x) => !x.mint || !remote.some((r) => r.mint === x.mint));
  for (const r of remote) {
    const l = byMint.get(r.mint);
    merged.push({ id: l?.id ?? r.mint, at: r.createdAt || l?.at || 0, name: r.name, ticker: r.symbol, tier: r.tier, devBuySol: l?.devBuySol ?? 0, tweetUrl: l?.tweetUrl ?? null, image: l?.image ?? null,
      status: "confirmed", mint: r.mint, signature: l?.signature ?? null, error: null, mcapUsd: r.mcapUsd, source: l ? "both" : "api" });
  }
  return merged.sort((a, b) => b.at - a.at);
}

// ---- referral: wallet sign-in once, then POST /referrals ----
async function signIn(kp: Keypair, s: Settings): Promise<string> {
  const A = A0(), address = kp.publicKey.toBase58();
  const cfg = await config(s);
  const { nonce } = await A.nonce(address);
  const origin = chrome.runtime.getURL("").replace(/\/$/, "");
  const message = `highbar wants you to sign in with your Solana account:\n${address}\n\nSign in to highbar. This does not cost any SOL.\n\nURI: ${origin}\nNetwork: ${cfg?.network ?? "devnet"}\nNonce: ${nonce}\nIssued At: ${new Date().toISOString()}`;
  const sig = nacl.sign.detached(utf8(message), kp.secretKey);
  return (await A.verify({ address, message, signature: bs58.encode(sig) })).token;
}
/** Binds `referrer` for one wallet: that wallet signs in (its own nonce and signature) and the binding is kept per address. */
async function bindReferral(kp: Keypair, referrer: string) {
  const s = await settings(), address = kp.publicKey.toBase58();
  if (referrer === address) throw new Error("You cannot refer yourself");
  const token = await signIn(kp, s);
  const r = await A0().bindReferral(token, referrer);
  const map = readReferrals((await chrome.storage.local.get(REFERRAL))[REFERRAL]);
  map[address] = { referrer: r.referrer, at: Date.now() };
  await chrome.storage.local.set({ [REFERRAL]: map });
  return { referrer: r.referrer, created: !!r.created };
}
/** Before a launch: bind the preset referrer once for the launching wallet if it is not bound yet. Never blocks the launch. */
async function ensureReferral(s: Settings, kp: Keypair) {
  const ref = s.presets.referrer;
  if (!ref) return;
  const map = readReferrals((await chrome.storage.local.get(REFERRAL))[REFERRAL]);
  if (map[kp.publicKey.toBase58()]) return;
  await bindReferral(kp, ref).catch(() => {});
}

// ---- portfolio ----
async function portfolio(): Promise<Portfolio> {
  const v = await W.active();
  if (!v) throw new Error("No wallet yet");
  const s = await settings(), R = rpcFor(s), A = A0(), site = (await config(s))?.siteUrl ?? DEFAULT_SITE;
  const [lamports, spl, t22] = await Promise.all([R.balance(v.address).then((l) => { balCache.set(v.address, { sol: l / 1e9, at: Date.now(), rpc: rpcEndpoint(s) }); return l; }), R.tokenAccounts(v.address, TOKEN_PROGRAM), R.tokenAccounts(v.address, TOKEN_2022).catch(() => [])]);
  const rows = [...spl.map((a) => ({ a, program: "spl" as const })), ...t22.map((a) => ({ a, program: "t22" as const }))]
    .map(({ a, program }) => ({ mint: a.account.data.parsed.info.mint, amount: a.account.data.parsed.info.tokenAmount.uiAmount ?? 0, program }))
    .filter((x) => x.amount > 0).slice(0, 40);
  const tokens = await Promise.all(rows.map(async (x) => {
    const t = await A.token(x.mint).catch(() => null);
    return { ...x, name: t?.name ?? null, symbol: t?.symbol ?? null, image: resolveImage(t?.image, site), valueSol: t ? x.amount * t.priceSol : null };
  }));
  tokens.sort((a, b) => (b.valueSol ?? -1) - (a.valueSol ?? -1));
  return { sol: lamports / 1e9, tokens, updatedAt: Date.now() };
}

// ---- Holding panel: launches and balances per wallet, read only while the panel is open (the content script polls) ----
type Cached<T> = { at: number; v: T; key: string };
const holdC = { created: new Map<string, Cached<CreatedToken[]>>(), bal: new Map<string, Cached<Bal[]>>(), trades: new Map<string, Cached<TradeLite[] | null>>(),
  info: new Map<string, Cached<TokenView | null>>(), img: new Map<string, { v: string | null; at: number }>() };
async function cached<T>(m: Map<string, Cached<T>>, id: string, key: string, ttl: number, load: () => Promise<T>, onErr: (e: unknown) => void): Promise<T | undefined> {
  const c = m.get(id);
  if (c && c.key === key && Date.now() - c.at < ttl) return c.v;
  try { const v = await load(); m.set(id, { at: Date.now(), v, key }); return v; }
  catch (e) { onErr(e); return c?.key === key ? c.v : undefined; }
}
const forgetWallet = (address: string) => { holdC.bal.delete(address); holdC.trades.delete(address); holdC.created.delete(address); };

async function holdPrefs(): Promise<HoldPrefs> {
  const ui = ((await chrome.storage.session.get(HOLD_UI))[HOLD_UI] ?? {}) as { open?: unknown; filter?: unknown };
  const slip = (await chrome.storage.local.get(SELL_SLIPPAGE))[SELL_SLIPPAGE];
  return { open: ui.open === true, filter: typeof ui.filter === "string" ? ui.filter : null, slippagePct: cleanSlippage(slip) };
}
async function setHoldPrefs(p: { open?: boolean; filter?: string | null; slippagePct?: number }): Promise<HoldPrefs> {
  const cur = await holdPrefs();
  const ids = (await W.list()).map((w) => w.id);
  const next = { open: typeof p.open === "boolean" ? p.open : cur.open, filter: p.filter === undefined ? cur.filter : typeof p.filter === "string" && ids.includes(p.filter) ? p.filter : null };
  await chrome.storage.session.set({ [HOLD_UI]: next });
  if (p.slippagePct !== undefined) await chrome.storage.local.set({ [SELL_SLIPPAGE]: cleanSlippage(p.slippagePct) });
  return holdPrefs();
}

async function holding(walletIds: unknown, fresh: boolean): Promise<HoldingRes> {
  const all = await W.list(), s = await settings(), cfg = await config(s), endpoint = rpcEndpoint(s);
  const want = Array.isArray(walletIds) ? walletIds.filter((x): x is string => typeof x === "string") : [];
  let wallets = all.filter((w) => want.includes(w.id));
  if (!wallets.length) { const ids = await drawerWallets(); wallets = all.filter((w) => ids.includes(w.id)); }
  wallets = wallets.slice(0, MULTI_MAX);
  const R = rpc(endpoint, s.rpcUrl ? CUSTOM_RPC_DOWN : SERVER_RPC_DOWN, 8000), A = A0(), errors = new Set<string>();
  const note = (e: unknown) => errors.add((e as Error)?.message || "Could not load everything");
  const created: Record<string, CreatedToken[]> = {}, balances: Record<string, Bal[]> = {}, trades: Record<string, TradeLite[] | null> = {}, history: Record<string, HistoryItem[]> = {};
  if (fresh) for (const w of wallets) forgetWallet(w.address);
  // one wallet at a time: 1 api read, 1 RPC read, and the trades once a minute
  for (const w of wallets) {
    created[w.address] = (await cached(holdC.created, w.address, API_BASE, 10_000, () => A.created(w.address), note)) ?? [];
    balances[w.address] = (await cached(holdC.bal, w.address, endpoint, 10_000, async () => (await R.tokenAccounts(w.address, TOKEN_PROGRAM))
      .map((a) => ({ mint: a.account.data.parsed.info.mint, raw: String(a.account.data.parsed.info.tokenAmount.amount ?? "0"), decimals: Number(a.account.data.parsed.info.tokenAmount.decimals ?? 6) })), note)) ?? [];
    trades[w.address] = (await cached(holdC.trades, w.address, API_BASE, 60_000, () => A.trades(w.address), () => {})) ?? null;
    history[w.address] = await localHistory(w.address);
  }
  // held tokens these wallets did not launch: GET /tokens/:mint, a 404 means not a highbar token (kept 10 minutes)
  const mine = new Set(Object.values(created).flat().map((c) => c.mint));
  const others = [...new Set(Object.values(balances).flat().filter((b) => b.raw !== "0" && !mine.has(b.mint)).map((b) => b.mint))].slice(0, 15);
  const info: Record<string, TokenView | null> = {};
  for (const m of others) {
    const c = holdC.info.get(m);
    if (c && Date.now() - c.at < (c.v ? 15_000 : 600_000)) { info[m] = c.v; continue; }
    try { const v = await A.token(m); holdC.info.set(m, { at: Date.now(), v, key: "" }); info[m] = v; }
    catch (e) { if (e instanceof ApiError && e.status === 404) { holdC.info.set(m, { at: Date.now(), v: null, key: "" }); info[m] = null; } else info[m] = c?.v ?? null; }
  }
  const rows = buildRows({ wallets: wallets.map((w) => ({ id: w.id, label: w.label, address: w.address })), created, balances, trades, history, info, siteUrl: cfg?.siteUrl ?? DEFAULT_SITE });
  // Images reach the panel as data URLs only (x.com's CSP blocks the api and site hosts). A miss is tried again after 5 minutes.
  const site = cfg?.siteUrl ?? DEFAULT_SITE;
  for (const r of rows) {
    if (r.image) continue;
    const c = holdC.img.get(r.mint);
    if (!c || (!c.v && Date.now() - c.at > 300_000)) {
      const cr = Object.values(created).flat().find((x) => x.mint === r.mint);
      const local = Object.values(history).flat().find((x) => x.mint === r.mint)?.image ?? null;
      holdC.img.set(r.mint, { v: await tokenThumb(API_BASE, r.mint, { siteUrl: site, image: info[r.mint]?.image ?? null, uri: cr?.uri ?? null, local }), at: Date.now() });
    }
    r.image = holdC.img.get(r.mint)?.v ?? null;
  }
  return { rows, walletIds: wallets.map((w) => w.id), rpcMode: s.rpcUrl ? "custom" : "server", network: cfg?.network ?? "devnet", pollMs: pollMs(wallets.length), updatedAt: Date.now(), errors: [...errors].slice(0, 2) };
}

// ---- sell (Holding panel): built here, checked, signed by the owning wallet, simulated, then sent ----
function sellDeps(s: Settings, sent?: (sig: string) => void): SellDeps {
  const R = rpcFor(s), A = A0(), fast = s.fastTrade;
  return {
    fast,
    fee: () => extFee(s),
    owner: async (id) => {
      const w = (await W.list()).find((x) => x.id === id);
      if (!w) throw new SellAborted("That wallet is not in the extension");
      if (w.needsMigration) throw new SellAborted("Finish the wallet update in the side panel first");
      return { address: w.address, label: w.label };
    },
    keypair: (id) => W.keypair(id),
    balance: async (owner, mint) => {
      const mine = ata(new PublicKey(owner), new PublicKey(mint)).toBase58();
      const acc = (await R.tokenAccounts(owner, TOKEN_PROGRAM)).find((a) => a.pubkey === mine && a.account.data.parsed.info.mint === mint);
      if (!acc) throw new SellAborted("This wallet holds none of this token");
      return { raw: BigInt(acc.account.data.parsed.info.tokenAmount.amount ?? "0"), decimals: Number(acc.account.data.parsed.info.tokenAmount.decimals) };
    },
    target: (mint) => targetC.get(mint, async () => {
      const t = await A.token(mint);
      if (!t.isMigrated) { if (!t.pool) throw new SellAborted("The pool for this token is not known yet"); return { route: "dbc", pool: t.pool }; }
      const dp = (await A.openbook(mint)).migration?.steps?.migrated?.dammPool;
      if (!dp) throw new SellAborted("This token is moving to its DAMM v2 pool. Try again in a minute");
      return { route: "damm" as const, pool: dp };
    }),
    // Before migration: the api's POST /tx/swap, the same Meteora DBC swap2 the web trade panel builds (fee payer = owner, unsigned).
    buildDbc: async (a: BuildArgs) => {
      if (a.decimals !== 6) throw new SellAborted("This token does not use 6 decimals, the bonding curve sell cannot size it");
      const r = a.side === "buy"
        ? await A.swap({ owner: a.owner.toBase58(), pool: a.pool, side: "buy", amount: rawToUi(a.amountRaw, 9), slippageBps: a.slippageBps })
        : await A.swap({ owner: a.owner.toBase58(), pool: a.pool, side: "sell", amount: rawToUi(a.amountRaw, 6), slippageBps: a.slippageBps });
      return Transaction.from(unb64(r.tx));
    },
    // After migration: Meteora DAMM v2 swap from @meteora-ag/cp-amm-sdk, built here with the configured RPC. No referral account.
    buildDamm: (a: BuildArgs) => (a.side === "buy" ? buildDammBuy : buildDammSell)(new Connection(rpcEndpoint(s), { commitment: "confirmed", disableRetryOnRateLimit: true }), a, () => hashC.get(rpcEndpoint(s), async () => (await R.latestBlockhash()).blockhash)),
    simulate: async (raw) => {
      const r = await R.call<{ value: { err: unknown; logs?: string[] | null; unitsConsumed?: number } }>("simulateTransaction", [b64(raw), { encoding: "base64", sigVerify: true, commitment: "confirmed" }]);
      return { err: r?.value?.err ?? null, logs: r?.value?.logs ?? null, unitsConsumed: typeof r?.value?.unitsConsumed === "number" ? r.value.unitsConsumed : null };
    },
    send: (raw, onSent) => sendAndConfirm(R, raw, { onSent: (sig) => { onSent(sig); sent?.(sig); }, what: "sell transaction", skipPreflight: fast, pollMs: fast ? 400 : 700 }),
  };
}
async function sell(m: SellPortIn, step0: (s: SellPortOut) => void): Promise<SellPortOut> {
  const tm = timer();
  const [s, cfg] = await Promise.all([settings(), settings().then(config)]);
  const R = rpcFor(s), net = cfg?.network ?? "devnet";
  // per-step timings (ms since the click reached the worker) for Diagnostics; "sent" goes to the popup at once (fast mode
  // shows it as success, the confirmation follows in the background and only a failure toasts again)
  const step = (x: SellPortOut) => { if (x.type === "step") tm.mark(x.step); step0(x); };
  const sent = (sig: string) => { tm.mark("sent"); step0({ type: "sent", signature: sig, solscanUrl: solscan("tx", sig, net), ms: tm.marks() }); };
  const owner = (await W.list().catch(() => [])).find((x) => x.id === m.walletId)?.address ?? null;
  // the wallet's SOL and token balance before the trade, read while the trade is being built, for the trade ledger (PnL card)
  const before = owner ? snap(R, owner, m.mint).catch(() => null) : Promise.resolve(null);
  try {
    const r = await trade(m, s, net, step, sent);
    tm.mark("confirmed");
    void lastTrade({ at: Date.now(), side: m.side ?? "sell", route: r.route ?? "highbar pool", ok: true, note: r.signature, ms: tm.marks(), fast: s.fastTrade });
    if (owner) void record(R, owner, m, r.signature, before);
    posC.delete(`${owner}:${m.mint}`); if (owner) heldC.delete(owner);
    // the toast says "Buy success · View tx": the route stays in Diagnostics
    return { type: "done", signature: r.signature, solscanUrl: r.solscanUrl, amountRaw: r.amountRaw, ms: tm.marks() };
  } catch (e) {
    void lastTrade({ at: Date.now(), side: m.side ?? "sell", route: null, ok: false, note: friendly(e), ms: tm.marks(), fast: s.fastTrade });
    return { type: "error", error: publicTradeError(friendly(e)), code: (e as { code?: string }).code, sent: "sent" in tm.marks() };
  }
}

// ---- trade ledger: SOL in/out and tokens per confirmed CA popup trade, per wallet and token (the PnL card's cost basis) ----
type Snap = { lam: number; raw: bigint; dec: number };
async function snap(R: Rpc, owner: string, mint: string): Promise<Snap> {
  const [lam, a, b] = await Promise.all([R.balance(owner), R.tokenAccounts(owner, TOKEN_PROGRAM), R.tokenAccounts(owner, TOKEN_2022).catch(() => [])]);
  let raw = 0n, dec = 6;
  for (const x of [...a, ...b]) {
    const i = x.account.data.parsed.info;
    if (i.mint !== mint) continue;
    try { raw += BigInt(i.tokenAmount.amount ?? "0"); } catch { /* not an integer */ }
    dec = Number(i.tokenAmount.decimals);
  }
  return { lam, raw, dec };
}
let ledgerQ: Promise<unknown> = Promise.resolve();
async function record(R: Rpc, owner: string, m: SellPortIn, sig: string, before: Promise<Snap | null>) {
  const b = await before;
  if (!b) return;
  for (let i = 0; i < 4; i++) {
    if (i) await sleep(1200 * i);
    const a = await snap(R, owner, m.mint).catch(() => null);
    if (!a) continue;
    const dRaw = a.raw - b.raw, dSol = (b.lam - a.lam) / 1e9, side: "buy" | "sell" = m.side === "buy" ? "buy" : "sell";
    if (side === "buy" ? dRaw <= 0n : dRaw >= 0n) continue; // balance not updated yet
    const e = { sig, side, sol: Math.max(0, side === "buy" ? dSol : -dSol), raw: (dRaw < 0n ? -dRaw : dRaw).toString(), decimals: a.dec, at: Date.now() };
    ledgerQ = ledgerQ.then(async () => {
      const l = readLedger((await chrome.storage.local.get(LEDGER_KEY))[LEDGER_KEY]);
      await chrome.storage.local.set({ [LEDGER_KEY]: addEntry(l, owner, m.mint, e) });
    }).catch(() => {});
    posC.delete(`${owner}:${m.mint}`);
    return;
  }
}
const LAST_TRADE = "hb.lastTrade";
const lastTrade = (v: { at: number; side: string; route: string | null; ok: boolean; note: string; ms?: Record<string, number>; fast?: boolean }) => chrome.storage.session.set({ [LAST_TRADE]: v }).catch(() => {});
let solUsdC: { v: number; at: number } | null = null;
async function solUsd(): Promise<number | null> {
  if (solUsdC && Date.now() - solUsdC.at < 60_000) return solUsdC.v;
  const SOL = "So11111111111111111111111111111111111111112";
  for (const base of [JUP_PRICE, "https://lite-api.jup.ag/price/v3"]) {
    try {
      const r = await fetch(`${base}?ids=${SOL}`, { credentials: "omit", signal: AbortSignal.timeout(4000) });
      const v = Number(((await r.json()) as Record<string, { usdPrice?: number }>)?.[SOL]?.usdPrice);
      if (r.ok && v > 0) { solUsdC = { v, at: Date.now() }; return v; }
    } catch { /* next host */ }
  }
  return solUsdC?.v ?? null;
}
const posC = new Map<string, { at: number; v: Snap }>();
/** The PnL card: the wallet's balance of the token (5 s cache, dropped after its trades), the ledger entries and SOL/USD. */
async function position(walletId: string, mint: string) {
  const w = (await W.list()).find((x) => x.id === walletId);
  if (!w) throw new Error("That wallet is not in the extension");
  const key = `${w.address}:${mint}`, c = posC.get(key);
  const [b, l, usd] = await Promise.all([
    c && Date.now() - c.at < 5000 ? c.v : snap(rpcFor(await settings()), w.address, mint).then((v) => { posC.set(key, { at: Date.now(), v }); return v; }),
    chrome.storage.local.get(LEDGER_KEY).then((r) => readLedger(r[LEDGER_KEY])),
    solUsd(),
  ]);
  if (posC.size > 50) for (const [k, x] of posC) if (Date.now() - x.at > 60_000) posC.delete(k);
  return { walletId, label: w.label, balanceRaw: b.raw.toString(), decimals: b.dec, solUsd: usd, entries: l[w.address]?.[mint] ?? [] };
}
async function trade(m: SellPortIn, s: Settings, network: "mainnet" | "devnet", step: (s: SellPortOut) => void, sent?: (sig: string) => void) {
  // highbar tokens trade on their own pool (DBC, or DAMM v2 after migration); any other token through Jupiter
  if (!(await CA.hbToken(m.mint))) {
    if (network !== "mainnet") throw new SellAborted("Jupiter swaps run on mainnet only");
    const d: JupDeps = { ...jupDeps(s, sent), step: (x) => step({ type: "step", step: x }) };
    const r = m.side === "buy"
      ? await runJupBuy({ walletId: m.walletId, mint: m.mint, sol: Number(m.sol), slippagePct: cleanCaSlippage(m.slippagePct), prioritySol: s.prioritySol }, d)
      : await runJupSell({ walletId: m.walletId, mint: m.mint, pct: Number(m.pct), slippagePct: cleanCaSlippage(m.slippagePct), prioritySol: s.prioritySol }, d);
    forgetWallet(r.wallet);
    return { type: "done" as const, signature: r.signature, solscanUrl: solscan("tx", r.signature, network), amountRaw: r.amountRaw, route: r.route };
  }
  if (m.side === "buy") {
    const R = rpcFor(s);
    const r = await runBuy({ walletId: m.walletId, mint: m.mint, sol: Number(m.sol), slippagePct: cleanSlippage(m.slippagePct), prioritySol: s.prioritySol },
      { ...sellDeps(s, sent), solBalance: async (owner) => (await R.balance(owner)) / 1e9, step: (x) => step({ type: "step", step: x }) });
    forgetWallet(r.wallet);
    return { type: "done" as const, signature: r.signature, solscanUrl: solscan("tx", r.signature, network), amountRaw: r.lamports };
  }
  const cfg = { network };
  const r = await runSell({ walletId: m.walletId, mint: m.mint, pct: Number(m.pct), slippagePct: cleanSlippage(m.slippagePct), prioritySol: s.prioritySol }, { ...sellDeps(s, sent), step: (x) => step({ type: "step", step: x }) });
  forgetWallet(r.wallet);
  return { type: "done" as const, signature: r.signature, solscanUrl: solscan("tx", r.signature, cfg.network), amountRaw: r.amountRaw };
}

// ---- CA popup: token data and Jupiter swaps for tokens that are not highbar's ----
const CANDLES = candleService({ api: A0() });
const CA = caService({ rpc: async () => rpcFor(await settings()), api: A0(), apiBase: API_BASE, siteUrl: async () => (await config(await settings()))?.siteUrl ?? DEFAULT_SITE });
const jupGate = gate(2100);
/** Jupiter's Metis API, the current host first and the older lite-api host when it fails. */
async function jupFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let last: unknown;
  for (const base of JUP_BASES) {
    try {
      return await jupGate(async () => {
        const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 12_000);
        try {
          const r = await fetch(`${base}${path}`, { ...init, credentials: "omit", signal: ctl.signal });
          const j = await r.json().catch(() => null) as (T & { error?: string; errorCode?: string }) | null;
          if (!r.ok || !j) throw new SellAborted(j?.error ? `Jupiter: ${String(j.error).slice(0, 160)}` : `Jupiter did not answer (HTTP ${r.status})`, "JUP_HTTP");
          return j;
        } finally { clearTimeout(t); }
      });
    } catch (e) { last = e; if ((e as SellAborted)?.message?.startsWith("Jupiter: ")) break; }
  }
  throw last instanceof Error ? last : new SellAborted("Jupiter did not answer", "JUP_HTTP");
}
function jupDeps(s: Settings, sent?: (sig: string) => void): JupDeps {
  const R = rpcFor(s), base = sellDeps(s), fast = s.fastTrade;
  return {
    fast,
    owner: base.owner, keypair: base.keypair,
    fee: () => extFee(s),
    // The swap tx's lookup tables, read through the same RPC (getMultipleAccounts, base64), to append the highbar fee.
    lookupTables: async (keys) => {
      const r = await R.call<{ value: ({ data: [string, string] } | null)[] }>("getMultipleAccounts", [keys.map((k) => k.toBase58()), { encoding: "base64", commitment: "confirmed" }]);
      return keys.map((key, i) => {
        const a = r?.value?.[i];
        if (!a || !Array.isArray(a.data)) throw new Error("lookup table not found");
        return new AddressLookupTableAccount({ key, state: AddressLookupTableAccount.deserialize(unb64(a.data[0])) });
      });
    },
    solLamports: (owner) => R.balance(owner),
    tokenBalance: async (owner, mint) => {
      for (const prog of [TOKEN_PROGRAM, TOKEN_2022]) {
        const mine = ata(new PublicKey(owner), new PublicKey(mint), prog).toBase58();
        const acc = (await R.tokenAccounts(owner, prog)).find((a) => a.pubkey === mine && a.account.data.parsed.info.mint === mint);
        if (acc) return { raw: BigInt(acc.account.data.parsed.info.tokenAmount.amount ?? "0"), decimals: Number(acc.account.data.parsed.info.tokenAmount.decimals) };
      }
      throw new SellAborted("This wallet holds none of this token");
    },
    quote: (input, output, amount, bps) => { const p = quotePath(input, output, amount, bps); return quoteC.get(p, () => jupFetch<JupQuote>(p)); },
    swapTx: async (quote, owner, priority) => {
      const r = await jupFetch<{ swapTransaction?: string; simulationError?: unknown }>("/swap", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(swapBody(quote, owner, priority, !fast)) });
      if (typeof r.swapTransaction !== "string") throw new SellAborted("Jupiter sent no transaction", "JUP_HTTP");
      return r.swapTransaction;
    },
    // Same simulate as the Holding panel, plus the owner's account so the SOL it would spend can be checked.
    simulate: async (raw, owner) => {
      const r = await R.call<{ value: { err: unknown; logs?: string[] | null; accounts?: ({ lamports?: number } | null)[] | null } }>("simulateTransaction",
        [b64(raw), { encoding: "base64", sigVerify: true, commitment: "confirmed", accounts: { addresses: [owner], encoding: "base64" } }]);
      const after = r?.value?.accounts?.[0]?.lamports;
      return { err: r?.value?.err ?? null, logs: r?.value?.logs ?? null, lamportsAfter: typeof after === "number" ? after : null };
    },
    send: (raw, onSent) => sendAndConfirm(R, raw, { onSent: (sig) => { onSent(sig); sent?.(sig); }, what: "swap", skipPreflight: fast, pollMs: fast ? 400 : 700 }),
  };
}
/** ca:held: the wallet's tokens with a balance (SPL and Token-2022, 12 at most), named and priced from the CA popup's own
 *  token info (cached per mint), biggest value first. 10 s cache per wallet; dropped after a trade. */
const heldC = memo<HeldToken[]>(10_000, 20);
async function held(walletId: string): Promise<HeldToken[]> {
  const w = (await W.list()).find((x) => x.id === walletId);
  if (!w) throw new Error("That wallet is not in the extension");
  return heldC.get(w.address, async () => {
    const R = rpcFor(await settings());
    const [a, b] = await Promise.all([R.tokenAccounts(w.address, TOKEN_PROGRAM), R.tokenAccounts(w.address, TOKEN_2022).catch(() => [])]);
    const amt = new Map<string, number>();
    for (const x of [...a, ...b]) { const i = x.account.data.parsed.info, n = Number(i.tokenAmount.uiAmount ?? 0); if (n > 0) amt.set(i.mint, (amt.get(i.mint) ?? 0) + n); }
    const rows = await Promise.all([...amt].slice(0, 24).map(async ([mint, amount]) => {
      const t = await CA.info(mint).catch(() => null);
      const priceUsd = t?.priceUsd ?? null;
      return { mint, amount, symbol: t?.symbol || null, name: t?.name || null, image: t?.image ?? null, priceUsd, valueUsd: priceUsd !== null ? amount * priceUsd : null, change24h: t?.change24h ?? null };
    }));
    return rows.sort((x, y) => (y.valueUsd ?? -1) - (x.valueUsd ?? -1)).slice(0, 12);
  });
}
/** trade:warm: fills the caches the next click reads (pool route or a Jupiter quote for the typed buy amount, a blockhash,
 *  the fee config and the token check). Read only and best effort: nothing is built, signed or sent. */
async function warm(mint: string, sol?: number) {
  if (!isPubkey(mint)) return;
  try {
    const s = await settings(), R = rpcFor(s);
    void config(s).catch(() => null);
    void hashC.get(rpcEndpoint(s), async () => (await R.latestBlockhash()).blockhash).catch(() => {});
    if (await CA.hbToken(mint)) { await sellDeps(s).target(mint).catch(() => {}); return; }
    const n = Number(sol);
    if (Number.isFinite(n) && n > 0 && n <= 100) {
      const p = quotePath("So11111111111111111111111111111111111111112", mint, BigInt(Math.round(n * 1e9)), slippageBps(cleanCaSlippage((await caPrefs()).slippagePct)));
      await quoteC.get(p, () => jupFetch<JupQuote>(p)).catch(() => {});
    }
  } catch { /* warming is optional */ }
}
async function caPrefs(): Promise<CaPrefs> {
  const v = (await chrome.storage.local.get(CA_PREFS))[CA_PREFS] as Partial<CaPrefs> | undefined;
  return { slippagePct: v?.slippagePct === undefined ? CA_SLIPPAGE_DEFAULT : cleanCaSlippage(v.slippagePct), tab: v?.tab === "sell" ? "sell" : "buy" };
}

// ---- fees ----
async function claim(pool: string, kind: "trading" | "migration" | "lp", position?: string) {
  const kp = await W.keypair(), s = await settings(), A = A0();
  const cfg = await config(s);
  const built = await A.claimBuild({ creator: kp.publicKey.toBase58(), pool, kind, position });
  const tx = Transaction.from(unb64(built.tx));
  checkClaimTx(tx, kp.publicKey);
  tx.partialSign(kp);
  const sig = await sendAndConfirm(rpcFor(s), tx.serialize({ requireAllSignatures: true, verifySignatures: true }), { what: "claim transaction" });
  return { signature: sig, solscanUrl: solscan("tx", sig, cfg?.network ?? "devnet") };
}

// ---- launch ----
const bytes = (s: string) => new TextEncoder().encode(s).length;
interface Prepared { name: string; symbol: string; tweetUrl: string | null; o: LaunchPortIn["opts"]; devBuySol: number; uri: string; image: string | null }
/** Checks the draft. With `meta`, also the image and the metadata upload (one upload serves every wallet of a multi create,
 *  the uri is not tied to a mint). */
function checkDraft(msg: LaunchPortIn) {
  const name = cleanLabel(msg.draft.name), symbol = cleanLabel(msg.draft.ticker).toUpperCase();
  if (!name || bytes(name) > NAME_MAX_BYTES) throw new Error("The name must be 1 to 32 bytes");
  if (!symbol || bytes(symbol) > TICKER_MAX_BYTES) throw new Error("The ticker must be 1 to 10 bytes");
  const xLink = normalizeXLink(msg.draft.tweetUrl ?? "");
  if (xLink === null) throw new Error("The X link must be an x.com or twitter.com link or an @handle");
  const o = msg.opts;
  if (!LAUNCH_TIERS.includes(o.tier)) throw new Error("Pick Standard, Higher or Max");
  const devBuySol = Number(o.devBuySol);
  if (!Number.isFinite(devBuySol) || devBuySol < 0) throw new Error("Dev buy must be 0 or more");
  return { name, symbol, tweetUrl: xLink || null, o, devBuySol };
}
async function uploadMeta(msg: LaunchPortIn, d: ReturnType<typeof checkDraft>, step: (s: LaunchStep) => void, A = A0()): Promise<Prepared> {
  step("image");
  const image = msg.imageDataUrl ? checkDataUrl(msg.imageDataUrl) : msg.draft.imageUrl ? await imageUrlToDataUrl(msg.draft.imageUrl) : undefined;
  step("metadata");
  const meta = await A.metadata({ name: d.name, symbol: d.symbol, description: d.o.description.slice(0, 1000), twitter: d.tweetUrl ?? undefined, image });
  return { ...d, uri: meta.uri, image: meta.image ?? null };
}
/** One create for one wallet: its own mint (from the pool), its own signature, its own history entry. */
async function createOne(kp: Keypair, p: Prepared, s: Settings, step: (s: LaunchStep) => void, A = A0()): Promise<LaunchDone> {
  const cfg = await config(s);
  const creator = kp.publicKey.toBase58(), o = p.o;
  const id = `l-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const item: HistoryItem = { id, at: Date.now(), name: p.name, ticker: p.symbol, tier: o.tier, devBuySol: p.devBuySol, tweetUrl: p.tweetUrl, image: p.image, status: "pending", mint: null, signature: null, error: null, source: "local" };
  await putHistory(creator, item);
  try {
    step("mint");
    const r = await A.launch({ creator, name: p.name, symbol: p.symbol, uri: p.uri, tier: o.tier, antiSniper: o.antiSniper, devBuySol: p.devBuySol, slippageBps: o.slippageBps });
    item.mint = r.mint; await putHistory(creator, item);
    if (r.vanity === false || (r.mintSource ?? "pool") !== "pool") throw new TxCheckFailed('highbar returned a mint without the "high" suffix. Nothing was signed. Try again in a minute.');
    const tx = Transaction.from(unb64(r.tx));
    checkLaunchTx(tx, kp.publicKey, r.mint);
    // priority fee first (replaces any compute budget from the builder; the API accepts one limit and one price anywhere),
    // then the highbar fee on the dev buy: one transfer, last, only when the API allows it (dev buy, receiver, editable tx),
    // the receiver matches GET /config and the amount is the local copy of the API's math. Near 1232 bytes the fee goes
    // first, then the priority fee (no tip is ever added).
    const devBuy = launchDevBuyLamports(tx), prio = priorityLamports(s.prioritySol);
    setLegacyBudget(tx, devBuy ? CU_LIMIT.launch : CU_LIMIT.launchNoBuy, prio);
    const leg = launchFee(r.extFee, await extFee(s), devBuy);
    checkLaunchTx(tx, kp.publicKey, r.mint, addLaunchFee(tx, kp.publicKey, leg) ? leg : null, prio);
    step("sign");
    tx.partialSign(kp);
    step("cosign");
    const full = await A.cosign(r.mint, b64(tx.serialize({ requireAllSignatures: false, verifySignatures: false })));
    const fullTx = Transaction.from(unb64(full.tx));
    checkCosigned(tx, fullTx, kp.publicKey);
    if (!fullTx.verifySignatures()) throw new TxCheckFailed("The co-signed launch is missing a signature. Nothing was sent.");
    step("send");
    const signature = await sendAndConfirm(rpcFor(s), fullTx.serialize(), { what: "launch transaction", onSent: (sig) => { item.signature = sig; void putHistory(creator, item); step("confirm"); } });
    item.status = "confirmed"; item.signature = signature; await putHistory(creator, item);
    void confirmLater(s, r.mint, signature);
    step("done");
    const site = cfg?.siteUrl ?? DEFAULT_SITE;
    return { mint: r.mint, signature, tokenUrl: `${site}/token/${r.mint}`, solscanUrl: solscan("tx", signature, cfg?.network ?? "devnet") };
  } catch (e) {
    item.status = "failed"; item.error = (e as Error).message.slice(0, 240); await putHistory(creator, item);
    throw e;
  }
}
async function launch(msg: LaunchPortIn, step: (s: LaunchStep) => void): Promise<LaunchDone> {
  // The wallet picked in the drawer (by id, an address works too), else the active one. Only its keypair signs below.
  const ref = typeof msg.walletId === "string" && msg.walletId ? msg.walletId : null;
  const kp = await W.keypair(ref);
  const s = await settings();
  const d = checkDraft(msg);
  void ensureReferral(s, kp);
  return createOne(kp, await uploadMeta(msg, d, step), s, step);
}

/** API calls of a multi create wait and try again on 429 (rate limited) instead of failing that wallet. Only calls that are
 *  refused before anything happens are retried, never the send. */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
function patient(A: ReturnType<typeof A0>): ReturnType<typeof A0> {
  const wrap = <F extends (...a: never[]) => Promise<unknown>>(f: F) => (async (...a: Parameters<F>) => {
    for (let i = 0; ; i++) {
      try { return await f(...a); }
      catch (e) { if (!(e instanceof ApiError) || e.status !== 429 || i >= 3) throw e; await sleep(10_000 * (i + 1)); }
    }
  }) as unknown as F;
  return { ...A, metadata: wrap(A.metadata), launch: wrap(A.launch), cosign: wrap(A.cosign), quote: wrap(A.quote) };
}
/** Multi create: one separate token per checked wallet from the same draft, one after the other (the API allows 6 launch
 *  builds a minute per IP and the /rpc proxy 60 calls a minute, a confirm polls it). One upload of the image and metadata. */
async function launchMulti(msg: LaunchPortIn, update: (rows: MultiRow[]) => void): Promise<MultiRow[]> {
  const all = await W.list();
  const ids = [...new Set((msg.walletIds ?? []).filter((x) => typeof x === "string"))].slice(0, MULTI_MAX);
  const targets = ids.map((id) => all.find((w) => w.id === id)).filter((w): w is NonNullable<typeof w> => !!w).map((w) => ({ id: w.id, label: w.label, address: w.address, needsMigration: w.needsMigration }));
  if (!targets.length) throw new Error("Check at least one wallet");
  const s = await settings(), A = patient(A0());
  const d = checkDraft(msg);
  const ext = await extFee(s);
  // pool fee + the highbar fee (0.02% of the dev buy) when the API enables it
  const fee = d.devBuySol > 0 ? await A.quote(d.o.tier, d.o.antiSniper, d.devBuySol, d.o.slippageBps).then((q) => q.feeSol + (ext && q.extFee?.allowed && q.extFee.receiver === ext.receiver ? Number(q.extFee.lamports) / 1e9 : 0)).catch(() => 0) : 0;
  const need = launchNeedSol(d.devBuySol, fee + s.prioritySol);
  const R = rpc(rpcEndpoint(s), s.rpcUrl ? CUSTOM_RPC_DOWN : SERVER_RPC_DOWN, 8000);
  let prep: Promise<Prepared> | null = null;
  const rows = await runMulti(targets.map(({ id, label, address }) => ({ id, label, address })), need, {
    keypair: (id) => { if (targets.find((t) => t.id === id)?.needsMigration) throw new Error("Finish the wallet update in the side panel first"); return W.keypair(id); },
    balance: (a) => R.balance(a).then((l) => { balCache.set(a, { sol: l / 1e9, at: Date.now(), rpc: rpcEndpoint(s) }); return l / 1e9; }),
    createOne: async (kp, _t, step) => {
      await ensureReferral(s, kp); // this wallet's own sign-in and referral bind (never blocks the launch)
      prep ??= uploadMeta(msg, d, () => {}, A);
      const p = await prep.catch((e) => { prep = null; throw e; });
      return createOne(kp, p, s, step, A);
    },
    update,
  }, 1);
  return rows;
}
async function confirmLater(s: Settings, mint: string, signature: string) {
  for (let i = 0; i < 6; i++) {
    if (i) await new Promise((r) => setTimeout(r, 3000));
    if (await A0().confirmMint(mint, signature).then((x) => x.used).catch(() => false)) return;
  }
}

// ---- router ----
const isPage = (sender: chrome.runtime.MessageSender) => sender.id === chrome.runtime.id && !!sender.url?.startsWith(chrome.runtime.getURL(""));

async function handle(req: Req, sender: chrome.runtime.MessageSender): Promise<unknown> {
  if (PAGE_ONLY.has(req.type) && !isPage(sender)) throw new Error("Not allowed from a web page");
  const s = await settings();
  switch (req.type) {
    case "status": return status();
    case "wallet:create": { const r = await W.create(req.words === 24 ? 24 : 12, req.label); void broadcast(); return r; }
    case "wallet:import": { const r = await W.importWallet(req.input, req.label); void broadcast(); return r; }
    case "wallet:migrate": { const r = await W.migrate(req.id ?? null, req.password); void broadcast(); return r; }
    case "wallet:export": if (req.confirm !== true) throw new Error("Confirm first"); return W.exportSecret(req.id);
    case "wallet:remove": {
      if (req.confirm !== true) throw new Error("Confirm first");
      const { address } = await W.remove(req.id);
      const map = readReferrals((await chrome.storage.local.get(REFERRAL))[REFERRAL]); delete map[address];
      await chrome.storage.local.set({ [REFERRAL]: map });
      balCache.delete(address);
      void broadcast(); return { ok: true };
    }
    case "wallet:rename": { await W.rename(req.id, req.label); void broadcast(); return { ok: true }; }
    case "wallet:select": { await W.setActive(req.id); void broadcast(); return { ok: true }; }
    case "wallets:list": return walletRows(req.balances === true, req.fresh === true);
    case "drawer:wallets:get": return { ids: await drawerWallets() };
    case "drawer:wallets:set": return { ids: await setDrawerWallets(req.ids) };
    case "drawer:antisniper:set": {
      // The drawer switch is the user's choice: kept as the preset (on stays on, off stays off)
      const next = normalizeSettings({ ...s, presets: { ...s.presets, antiSniper: req.on === true, antiSniperChosen: true } });
      await chrome.storage.local.set({ [SETTINGS]: next });
      return { on: next.presets.antiSniper };
    }
    case "drawer:devpresets:get": return { values: readDevPresets((await chrome.storage.local.get(DEV_PRESETS))[DEV_PRESETS]) };
    case "drawer:devpresets:set": {
      if (req.values === null) { await chrome.storage.local.remove(DEV_PRESETS); return { values: readDevPresets(undefined) }; }
      const v = checkDevPresets(req.values);
      if (!v.ok) throw new Error(v.error);
      await chrome.storage.local.set({ [DEV_PRESETS]: v.values });
      return { values: v.values };
    }
    case "settings:get": return s;
    case "settings:set": {
      // rpcUrl only changes through rpc:set, which checks the endpoint first
      const pp = req.patch.presets ?? {}, chosen = typeof pp.antiSniper === "boolean" ? { antiSniperChosen: true } : {};
      const next = normalizeSettings({ ...s, ...req.patch, rpcUrl: s.rpcUrl, presets: { ...s.presets, ...pp, ...chosen } });
      await chrome.storage.local.set({ [SETTINGS]: next });
      void broadcast();
      return next;
    }
    case "referral:bind": return bindReferral(await W.keypair(), req.referrer.trim());
    case "portfolio": return portfolio();
    case "history": return history();
    case "fees": {
      const v = await W.active(); if (!v) throw new Error("No wallet yet");
      const site = (await config(s))?.siteUrl ?? DEFAULT_SITE, r = await A0().claims(v.address);
      return { ...r, tokens: r.tokens.map((t) => ({ ...t, image: resolveImage(t.image, site) })) };
    }
    case "fees:claim": return claim(req.pool, req.kind, req.position);
    case "quote": {
      const q = await A0().quote(req.tier, req.antiSniper, req.devBuySol, req.slippageBps), ext = await extFee(s);
      const f = q.extFee, ok = !!ext && !!f && f.allowed === true && f.bps === ext.bps && f.receiver === ext.receiver && /^[0-9]{1,20}$/.test(String(f.lamports)) && f.lamports !== "0";
      return { ...q, hbFeeLamports: ok ? String(f!.lamports) : null };
    }
    case "fee:info": return { ...feeInfo(await extFee(s)), prioritySol: s.prioritySol };
    case "priority:set": {
      const n = Number(req.sol);
      if (!Number.isFinite(n) || n < 0 || n > PRIORITY_MAX_SOL) throw new Error(`Pick a priority fee from 0 to ${PRIORITY_MAX_SOL} SOL`);
      const next = normalizeSettings({ ...s, prioritySol: n });
      await chrome.storage.local.set({ [SETTINGS]: next });
      void broadcast();
      return { prioritySol: next.prioritySol };
    }
    case "drawer:pos:get": return readPos((await chrome.storage.session.get(DRAWER_POS))[DRAWER_POS]);
    case "holding": return holding(req.walletIds, req.fresh === true);
    case "holding:prefs:get": return holdPrefs();
    case "holding:prefs:set": return setHoldPrefs(req);
    case "ca:check": return CA.check(Array.isArray(req.items) ? req.items : []);
    case "ca:ticker": return CA.ticker(req.symbol);
    case "ca:info": return CA.info(req.mint, req.fresh === true);
    case "ca:candles": return CANDLES.candles({ mint: req.mint, pool: req.pool ?? null, highbar: req.highbar === true, res: req.res, count: req.count, source: req.source ?? null, auto: req.auto === true, pump: req.pump === true, before: typeof req.before === "number" ? req.before : undefined });
    case "ca:live": return CANDLES.live(req.mint);
    case "ca:held": return held(req.walletId);
    case "trade:warm": { void warm(req.mint, req.sol); return { ok: true as const }; }
    case "ca:prefetch": { void CA.prefetch(Array.isArray(req.mints) ? req.mints : [], req.full === true).catch(() => {}); return { ok: true as const }; }
    case "ca:stats": return CA.stats(Array.isArray(req.mints) ? req.mints.slice(0, 30) : []);
    case "ca:audit": return CA.audit(req.mint);
    case "ca:position": return position(req.walletId, req.mint);
    case "diag:sources": return diagSources();
    case "ca:prefs:get": return caPrefs();
    case "ca:prefs:set": {
      const cur = await caPrefs();
      const next: CaPrefs = { slippagePct: req.slippagePct === undefined ? cur.slippagePct : cleanCaSlippage(req.slippagePct), tab: req.tab === "sell" || req.tab === "buy" ? req.tab : cur.tab };
      await chrome.storage.local.set({ [CA_PREFS]: next });
      return next;
    }
    case "ca:pos:get": return readPos((await chrome.storage.session.get(CA_POS))[CA_POS]);
    case "ca:pos:set": { const p = req.pos === null ? null : readPos(req.pos); if (p) await chrome.storage.session.set({ [CA_POS]: p }); else await chrome.storage.session.remove(CA_POS); return { ok: true }; }
    case "drawer:pos:set": { const p = req.pos === null ? null : readPos(req.pos); if (p) await chrome.storage.session.set({ [DRAWER_POS]: p }); else await chrome.storage.session.remove(DRAWER_POS); return { ok: true }; }
    case "rpc:set": return setRpc(req.url, s);
    case "open:sidepanel": await openSidePanel(sender); return { ok: true };
    default: throw new Error("Unknown request");
  }
}

async function openSidePanel(sender: chrome.runtime.MessageSender) {
  try {
    if (sender.tab?.id !== undefined) await chrome.sidePanel.open({ tabId: sender.tab.id });
    else { const w = await chrome.windows.getLastFocused(); await chrome.sidePanel.open({ windowId: w.id! }); }
  } catch { await chrome.tabs.create({ url: chrome.runtime.getURL("sidepanel.html") }); }
}

const friendly = (e: unknown) => (e instanceof WrongPassword ? "Wrong password" : e instanceof KeyMismatch ? e.message : (e as Error)?.message || "Something went wrong");

chrome.runtime.onMessage.addListener((req: Req, sender, reply: (r: Reply<unknown>) => void) => {
  if (sender.id !== chrome.runtime.id) return false;
  handle(req, sender).then((data) => reply({ ok: true, data }), (e) => reply({ ok: false, error: friendly(e), code: (e as { code?: string }).code }));
  return true;
});

chrome.runtime.onConnect.addListener((port) => {
  if (port.sender?.id !== chrome.runtime.id) { port.disconnect(); return; }
  if (port.name === "sell") {
    // One sell per port. The content script sends what to sell, never gets a key or a signed tx back.
    let used = false;
    const out = (m: SellPortOut) => { try { port.postMessage(m); } catch { /* panel closed: the sell keeps going */ } };
    port.onMessage.addListener((m: SellPortIn) => {
      if (m?.type !== "sell" || used) return;
      used = true;
      sell(m, out).then(out, (e) => out({ type: "error", error: publicTradeError(friendly(e)), code: (e as { code?: string }).code }));
    });
    return;
  }
  if (port.name !== "launch") { port.disconnect(); return; }
  let busy = false;
  const out = (m: LaunchPortOut) => { try { port.postMessage(m); } catch { /* drawer closed: the launch keeps going and lands in history */ } };
  port.onMessage.addListener((m: LaunchPortIn) => {
    if (m?.type !== "start" || busy) return;
    busy = true;
    if (Array.isArray(m.walletIds) && m.walletIds.length > 1) {
      launchMulti(m, (rows) => out({ type: "multi", rows })).then((rows) => out({ type: "multi:done", rows }), (e) => out({ type: "error", error: friendly(e), code: (e as { code?: string }).code })).finally(() => { busy = false; });
      return;
    }
    launch(m, (step) => out({ type: "step", step })).then((result) => out({ type: "done", result }), (e) => out({ type: "error", error: friendly(e), code: (e as { code?: string }).code })).finally(() => { busy = false; });
  });
});

chrome.commands.onCommand.addListener(async (cmd) => {
  if (cmd !== "launch-tweet") return;
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (tab?.id !== undefined) chrome.tabs.sendMessage(tab.id, { type: "hotkey:launch" }).catch(() => {});
});

// The toolbar icon opens the side panel (it holds setup, wallet and Settings). There is no popup.
const panelOnClick = () => chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
chrome.runtime.onInstalled.addListener(panelOnClick);
chrome.runtime.onStartup.addListener(panelOnClick);
void panelOnClick();
chrome.storage.session.setAccessLevel?.({ accessLevel: "TRUSTED_CONTEXTS" }).catch(() => {});
// Leftovers from the lock era: the old unlocked-key session entry, the auto-lock alarm and the stored auto-lock and API settings
void chrome.storage.session.remove("hb.session").catch(() => {});
void chrome.storage.local.get(SETTINGS).then((r) => { const o = r[SETTINGS] as Record<string, unknown> | undefined; if (o && ("autoLockMin" in o || "apiBase" in o)) return chrome.storage.local.set({ [SETTINGS]: normalizeSettings(o as Partial<Settings>) }); }).catch(() => {});
