/** CA popup data in the worker (x.com's CSP lets the content script fetch nothing itself). Sources, first that knows the token:
 *  the highbar api (/tokens/:mint, the token's own pool and stats), Jupiter's token search (name, icon, USD price, market cap,
 *  24h change and volume, verified), DexScreener (top pool, 24h volume and change, market cap) and GeckoTerminal (a pool for the
 *  chart when DexScreener has none). Answers are cached: mint checks for an hour, tickers for ten minutes, token data 15 s. */
import { caFromUrl, isMintAccount, isPubkey, NOT_TOKENS, pickTicker, type CaHit, type CaInfo, type PillStats, type TickerCandidate } from "../lib/ca";
import type { Api } from "../lib/api";
import type { Rpc } from "../lib/rpc";
import { firstThumb, metadataImage, tokenThumb } from "./image";
import { logoCandidates, withGateways } from "../lib/logo";
import { PUMP_API } from "../lib/candles";
import { metaplexUri, metadataPda } from "../lib/metadata";
import { lpBurntPct, notAllowed, parseMint, parsePumpSwapPool, PUMPSWAP, top10, type LpState, type TokenAudit } from "../lib/audit";
import bs58 from "bs58";

export const JUP_TOKENS = "https://api.jup.ag/tokens/v2/search";
export const DEXS_TOKENS = "https://api.dexscreener.com/tokens/v1/solana";
export const DEXS_PAIRS = "https://api.dexscreener.com/latest/dex/pairs/solana";
export const GT_POOLS = "https://api.geckoterminal.com/api/v2/networks/solana/tokens";

export interface JupToken { id: string; name?: string; symbol?: string; icon?: string; decimals?: number; usdPrice?: number; mcap?: number; fdv?: number; liquidity?: number;
  isVerified?: boolean; tokenProgram?: string; stats24h?: { priceChange?: number; buyVolume?: number; sellVolume?: number } }
export interface DexPair { pairAddress?: string; dexId?: string; priceUsd?: string; priceChange?: { h24?: number }; volume?: { h24?: number }; liquidity?: { usd?: number }; marketCap?: number; fdv?: number;
  baseToken?: { address?: string; name?: string; symbol?: string }; quoteToken?: { address?: string }; info?: { imageUrl?: string } }
/** pump.fun's coin record (GET frontend-api-v3.pump.fun/coins-v2/:mint), the fields used here. */
/** pump.fun's coin record. It indexes other tokens too: `program` is "pump" for its own launches, "non_launchpad" otherwise. */
export interface PumpCoin { mint?: string; name?: string; symbol?: string; image_uri?: string; metadata_uri?: string; program?: string; complete?: boolean; pump_swap_pool?: string | null }
/** pump.fun launched this coin (any address, not only "…pump" vanity ones). */
export const pumpLaunched = (pf: PumpCoin | null | undefined) => !!pf && pf.program !== "non_launchpad";
interface HbToken { mint: string; name: string; symbol: string; priceSol: number; mcapSol: number; mcapUsd: number; pool?: string; isMigrated?: boolean; image?: string | null; uri?: string; volume24hSol?: number }

const num = (v: unknown): number | null => { const n = typeof v === "string" ? Number(v) : (v as number); return typeof n === "number" && Number.isFinite(n) ? n : null; };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function getJson<T>(url: string, ms = 8000): Promise<T> {
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { credentials: "omit", signal: ctl.signal, headers: { accept: "application/json" } });
    if (!r.ok) throw Object.assign(new Error(`HTTP ${r.status}`), { status: r.status });
    return (await r.json()) as T;
  } finally { clearTimeout(t); }
}

/** One request at a time with a minimum gap (Jupiter's keyless tier allows about one call every two seconds). */
export function gate(gapMs: number) {
  let chain: Promise<unknown> = Promise.resolve(), last = 0;
  return <T>(fn: () => Promise<T>): Promise<T> => {
    const run = chain.then(async () => { const w = last + gapMs - Date.now(); if (w > 0) await sleep(w); try { return await fn(); } finally { last = Date.now(); } });
    chain = run.catch(() => {});
    return run;
  };
}

/** The top pair by liquidity, SOL or USD quoted first. */
export function topPair(pairs: DexPair[] | null | undefined, mint: string): DexPair | null {
  const mine = (pairs ?? []).filter((p) => p?.baseToken?.address === mint && typeof p.pairAddress === "string");
  return mine.sort((a, b) => (num(b.liquidity?.usd) ?? 0) - (num(a.liquidity?.usd) ?? 0))[0] ?? null;
}

/** Merges what the sources know into the popup shape (pure, tested). */
export function mergeInfo(mint: string, x: { hb?: HbToken | null; jup?: JupToken | null; dex?: DexPair | null; gtPool?: string | null; image?: string | null; siteUrl: string; pump?: PumpCoin | null }): CaInfo {
  const { hb, jup, dex } = x, pf = x.pump?.mint === mint ? x.pump : null;
  const solUsd = hb && hb.mcapSol > 0 && hb.mcapUsd > 0 ? hb.mcapUsd / hb.mcapSol : null;
  const vol = jup?.stats24h ? (num(jup.stats24h.buyVolume) ?? 0) + (num(jup.stats24h.sellVolume) ?? 0) : null;
  const sources = [hb && "highbar", jup && "jupiter", dex && "dexscreener", x.gtPool && "geckoterminal", pumpLaunched(pf) && "pump.fun"].filter((s): s is string => !!s);
  const hbPrice = hb && solUsd !== null ? hb.priceSol * solUsd : null;
  return {
    mint,
    name: hb?.name || jup?.name || dex?.baseToken?.name || pf?.name || "Unknown token",
    symbol: hb?.symbol || jup?.symbol || dex?.baseToken?.symbol || pf?.symbol || "?",
    image: x.image ?? null,
    priceUsd: hbPrice ?? num(jup?.usdPrice) ?? num(dex?.priceUsd),
    change24h: num(dex?.priceChange?.h24) ?? num(jup?.stats24h?.priceChange),
    mcapUsd: (hb && hb.mcapUsd > 0 ? hb.mcapUsd : null) ?? num(jup?.mcap) ?? num(dex?.marketCap) ?? num(dex?.fdv),
    volume24hUsd: num(dex?.volume?.h24) ?? (vol !== null && vol > 0 ? vol : null) ?? (hb && solUsd !== null && hb.volume24hSol !== undefined ? hb.volume24hSol * solUsd : null),
    liquidityUsd: num(dex?.liquidity?.usd) ?? num(jup?.liquidity),
    verified: jup?.isVerified === true,
    decimals: num(jup?.decimals) ?? (hb ? 6 : null),
    tokenProgram: jup?.tokenProgram === "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb" ? "t22" : (jup?.tokenProgram || hb) ? "spl" : null,
    highbar: !!hb, migrated: hb?.isMigrated === true,
    pool: dex?.pairAddress ?? x.gtPool ?? hb?.pool ?? null,
    dex: dex?.dexId ?? (x.gtPool ? "geckoterminal" : hb ? "meteora-dbc" : null),
    tokenUrl: hb ? `${x.siteUrl.replace(/\/$/, "")}/token/${mint}` : null,
    sources, updatedAt: Date.now(),
  };
}

export interface CaDeps { rpc: () => Promise<Rpc>; api: Api; apiBase: string; siteUrl: () => Promise<string> }

export function caService(d: CaDeps) {
  const jup = gate(2100), dexs = gate(250), gt = gate(2100), rpcGate = gate(1000), pumpGate = gate(250);
  const mintC = new Map<string, { v: string | null; at: number }>();
  const tickC = new Map<string, { v: CaHit | null; at: number }>();
  const infoC = new Map<string, { v: CaInfo; at: number }>();
  /** Logos: a data URL kept for the session; a miss is retried after 5 minutes. */
  const imgC = new Map<string, { v: string | null; at: number }>();
  const imgRun = new Map<string, Promise<string | null>>();
  const pumpC = new Map<string, { v: PumpCoin | null; at: number }>();
  const hbC = new Map<string, { v: HbToken | null; at: number }>();
  const inflight = new Map<string, Promise<CaInfo>>();
  const pumpBlk = new Map<string, { m: string; at: number }>();
  /** Raw source answers per mint (key "src:mint"), kept 15 s: a source that missed the popup's 1.5 s window still lands here
   *  and the next ask (the popup asks again while data is partial) uses it. Prefetch fills them too. */
  const rawC = new Map<string, { at: number; v: Promise<unknown> }>();
  const raw = <T>(key: string, fn: () => Promise<T>, ttl = 15_000): Promise<T> => {
    const c = rawC.get(key);
    if (c && Date.now() - c.at < ttl) return c.v as Promise<T>;
    const v = fn();
    rawC.set(key, { at: Date.now(), v });
    v.catch(() => rawC.delete(key));
    if (rawC.size > 400) for (const [k, x] of rawC) if (Date.now() - x.at > 60_000) rawC.delete(k);
    return v;
  };
  const TIMEOUT = Symbol("timeout");
  const within = <T>(p: Promise<T>, ms: number): Promise<T | typeof TIMEOUT> => Promise.race([p, sleep(ms).then((): typeof TIMEOUT => TIMEOUT)]);
  const SESSION_LOGO = (mint: string) => `hb.logo.${mint}`;

  const hbToken = async (mint: string): Promise<HbToken | null> => {
    const c = hbC.get(mint);
    if (c && Date.now() - c.at < 15_000) return c.v;
    let v: HbToken | null = null;
    try { v = (await d.api.token(mint)) as unknown as HbToken; } catch (e) { if ((e as { status?: number }).status !== 404 && !/not found|404/i.test(String((e as Error)?.message))) throw e; }
    hbC.set(mint, { v, at: Date.now() });
    return v;
  };

  /** addr -> the mint it names (itself when it is a mint, the base token when a link names a pool), or null. */
  async function check(items: { addr: string; link?: boolean }[]): Promise<Record<string, string | null>> {
    const out: Record<string, string | null> = {};
    const want = [...new Map(items.filter((i) => typeof i?.addr === "string").map((i) => [i.addr, !!i.link])).entries()].slice(0, 40);
    const todo: string[] = [];
    for (const [a] of want) {
      if (NOT_TOKENS.has(a) || !isPubkey(a)) { out[a] = null; continue; }
      const c = mintC.get(a);
      if (c && Date.now() - c.at < 60 * 60_000) out[a] = c.v; else todo.push(a);
    }
    for (let i = 0; i < todo.length; i += 20) {
      const batch = todo.slice(i, i + 20);
      const R = await d.rpc();
      const r = await rpcGate(() => R.call<{ value: ({ owner?: string; space?: number; data?: unknown } | null)[] }>("getMultipleAccounts",
        [batch, { encoding: "base64", commitment: "confirmed", dataSlice: { offset: 165, length: 1 } }]));
      for (let j = 0; j < batch.length; j++) {
        const a = batch[j];
        let v: string | null = isMintAccount(r?.value?.[j]) ? a : null;
        // a link to a pool page (DexScreener, Birdeye, Photon) names the pool: its base token is the mint
        if (!v && want.find(([x]) => x === a)?.[1] && r?.value?.[j]) {
          try { const p = await dexs(() => getJson<{ pairs?: DexPair[] }>(`${DEXS_PAIRS}/${a}`)); const b = p.pairs?.[0]?.baseToken?.address; if (b && isPubkey(b) && !NOT_TOKENS.has(b)) v = b; } catch { /* keep null */ }
        }
        mintC.set(a, { v, at: Date.now() }); out[a] = v;
      }
    }
    return out;
  }

  /** A $TICKER to one mint: a highbar token with that symbol (the api's own search), else Jupiter's search when one result is
   *  clearly it (pickTicker). The content script already used a CA in the same tweet before asking. */
  async function ticker(symbol: string): Promise<CaHit | null> {
    const sym = String(symbol ?? "").toUpperCase().replace(/^\$/, "");
    if (!/^[A-Z][A-Z0-9_]{0,11}$/.test(sym)) return null;
    const c = tickC.get(sym);
    if (c && Date.now() - c.at < 10 * 60_000) return c.v;
    let v: CaHit | null = null;
    try {
      const r = await d.api.get<{ items?: { mint: string; symbol: string }[] }>(`/tokens?q=${encodeURIComponent(sym)}&limit=20`);
      const same = (r.items ?? []).filter((t) => String(t.symbol).toUpperCase() === sym && isPubkey(t.mint));
      if (same.length === 1) v = { mint: same[0].mint, symbol: sym, via: "cashtag" };
    } catch { /* the api search is optional */ }
    if (!v) {
      const list = await jup(() => getJson<JupToken[]>(`${JUP_TOKENS}?query=${encodeURIComponent(sym)}`)).catch(() => [] as JupToken[]);
      const id = pickTicker(sym, (Array.isArray(list) ? list : []).map((t): TickerCandidate => ({ id: t.id, symbol: t.symbol ?? "", isVerified: t.isVerified, liquidity: t.liquidity })));
      if (id) v = { mint: id, symbol: sym, via: "cashtag" };
    }
    tickC.set(sym, { v, at: Date.now() });
    return v;
  }

  /** pump.fun's own coin record (name, image_uri, metadata_uri), 10 minutes. Needs the frontend-api-v3.pump.fun host
   *  permission: its CORS answers 403 to any Origin but pump.fun's, and a worker fetch with the host permission is not CORS. */
  async function pumpCoin(mint: string): Promise<PumpCoin | null> {
    const c = pumpC.get(mint);
    if (c && Date.now() - c.at < 10 * 60_000) return c.v;
    let blocked: string | null = null;
    const v = await pumpGate(() => getJson<PumpCoin>(`${PUMP_API}/coins-v2/${mint}`, 6000)).then((r) => (r?.mint === mint ? r : null)).catch((e) => {
      // not "unknown coin" (404) but refused: a Cloudflare page, a 403, a network or CORS failure. Remembered so the chart
      // still asks pump.fun and says why it shows another source.
      const m = String((e as Error)?.message ?? e);
      if (!/HTTP 404|HTTP 400/.test(m)) blocked = m;
      return null;
    });
    pumpC.set(mint, { v, at: Date.now() });
    if (blocked) pumpBlk.set(mint, { m: blocked, at: Date.now() }); else pumpBlk.delete(mint);
    return v;
  }

  /** The token logo as a 64 px data URL. Order: the highbar api's image (highbar tokens), pump.fun (its image CDN, then the
   *  coin's image_uri on IPFS gateways), the Jupiter icon, the DexScreener image, the metadata uri's image. */
  /** The token's metadata uri on chain: the Token-2022 metadata extension, else the Metaplex metadata account. One read-only
   *  getMultipleAccounts on the api's /rpc, only when no other source had an image. */
  async function onchainUri(mint: string): Promise<string | null> {
    try {
      const R = await d.rpc();
      const r = await rpcGate(() => R.call<{ value: ({ data?: unknown } | null)[] }>("getMultipleAccounts", [[mint, metadataPda(mint)], { encoding: "jsonParsed", commitment: "confirmed" }]));
      const ext = (r?.value?.[0]?.data as { parsed?: { info?: { extensions?: { extension?: string; state?: { uri?: string } }[] } } } | undefined)?.parsed?.info?.extensions;
      const t22 = ext?.find((e) => e?.extension === "tokenMetadata")?.state?.uri;
      if (typeof t22 === "string" && t22.trim()) return t22.trim();
      const md = r?.value?.[1]?.data;
      return Array.isArray(md) && typeof md[0] === "string" ? metaplexUri(md[0]) : null;
    } catch { return null; }
  }

  function logo(mint: string, x: { hb: HbToken | null; jupT: JupToken | null; dex: DexPair | null; pf: PumpCoin | null; site: string }): Promise<string | null> {
    const c = imgC.get(mint);
    if (c && (c.v || Date.now() - c.at < 5 * 60_000)) return Promise.resolve(c.v);
    const run = imgRun.get(mint);
    if (run) return run;
    const p = (async () => {
      // a logo found earlier this browser session (the worker sleeps after 30 s idle, chrome.storage.session outlives it)
      const ss = await chrome.storage?.session?.get(SESSION_LOGO(mint)).catch(() => null);
      const sv = ss?.[SESSION_LOGO(mint)];
      if (typeof sv === "string" && sv.startsWith("data:image/")) return sv;
      if (x.hb) { const t = await tokenThumb(d.apiBase, mint, { siteUrl: x.site, image: x.hb.image ?? null, uri: x.hb.uri ?? null }); if (t) return t; }
      const first = await firstThumb(logoCandidates({ mint, pump: pumpLaunched(x.pf), pumpImage: x.pf?.image_uri, jupIcon: x.jupT?.icon, dexImage: x.dex?.info?.imageUrl }));
      if (first) return first;
      const uri = x.pf?.metadata_uri ?? x.hb?.uri ?? (await onchainUri(mint));
      for (const u of withGateways(uri).slice(0, 2)) {
        const m = await metadataImage(u, x.site);
        if (m) return firstThumb(logoCandidates({ mint, metaImage: m }));
      }
      return null;
    })().catch(() => null).then((v) => {
      imgC.set(mint, { v, at: Date.now() }); imgRun.delete(mint);
      if (v) void chrome.storage?.session?.set({ [SESSION_LOGO(mint)]: v }).catch(() => {});
      return v;
    });
    imgRun.set(mint, p);
    return p;
  }

  const dexFor = (mint: string) => raw(`dex:${mint}`, () => dexs(() => getJson<DexPair[]>(`${DEXS_TOKENS}/${mint}`, 5000)));
  const jupFor = (mint: string) => raw(`jup:${mint}`, () => jup(() => getJson<JupToken[]>(`${JUP_TOKENS}?query=${mint}`, 5000)).then((l) => (Array.isArray(l) ? l.find((t) => t.id === mint) ?? null : null)), 60_000);
  const gtPoolFor = (mint: string) => raw(`gt:${mint}`, () => gt(() => getJson<{ data?: { attributes?: { address?: string } }[] }>(`${GT_POOLS}/${mint}/pools?page=1`, 5000)).then((g) => g.data?.[0]?.attributes?.address ?? null), 60_000);

  /** All sources at once, each given 1.5 s: the popup draws from whatever answered and asks again for the rest (partial). */
  async function load(mint: string): Promise<CaInfo & { partial?: boolean }> {
    const site = await d.siteUrl();
    const W = 1500;
    const [hbR, jupR, pairsR, pfR] = await Promise.all([
      within(raw(`hb:${mint}`, () => hbToken(mint)).catch(() => null), W),
      within(jupFor(mint).catch(() => null), W),
      within(dexFor(mint).catch(() => null), W),
      within(raw(`pf:${mint}`, () => pumpCoin(mint), 60_000), W),
    ]);
    let partial = [hbR, jupR, pairsR, pfR].some((x) => x === TIMEOUT);
    const v = <T>(x: T | typeof TIMEOUT): T | null => (x === TIMEOUT ? null : x);
    const hb = v(hbR), jupT = v(jupR), pf = v(pfR), pairs = v(pairsR);
    const dex = topPair(Array.isArray(pairs) ? pairs : null, mint);
    let gtPool: string | null = null;
    if (!dex && !hb?.pool) {
      const g = await within(gtPoolFor(mint).catch(() => null), W);
      if (g === TIMEOUT) partial = true; else gtPool = g;
    }
    if (!hb && !jupT && !dex && !gtPool && !pf) {
      if (partial) return { ...mergeInfo(mint, { hb, jup: jupT, dex, gtPool, image: null, siteUrl: site, pump: pf }), partial: true };
      throw new Error("No market data for this token yet");
    }
    // the logo resolves beside the data: a cached one comes now, a new one on the popup's next ask
    const img = logo(mint, { hb, jupT, dex, pf, site });
    const image = await Promise.race([img, sleep(250).then(() => null)]);
    const blk = !pf && !hb ? pumpBlk.get(mint)?.m ?? null : null;
    return { ...mergeInfo(mint, { hb, jup: jupT, dex, gtPool, image, siteUrl: site, pump: pf }), ...(partial ? { partial: true } : {}), ...(blk ? { pumpBlocked: blk } : {}) };
  }

  /** Tweets with a token button came into view: one DexScreener call for up to 30 mints warms the cache (name, price, pair),
   *  `full` (pointer over a button) loads everything for that one token. */
  const prefetchGate = gate(2000);
  async function prefetch(mints: string[], full = false): Promise<void> {
    const list = [...new Set(mints.filter((m) => isPubkey(m) && !NOT_TOKENS.has(m)))].slice(0, 30);
    if (full) { if (list[0]) await info(list[0]).catch(() => null); return; }
    const todo = list.filter((m) => !rawC.has(`dex:${m}`) && !infoC.has(m));
    if (!todo.length) return;
    await prefetchGate(async () => {
      const pairs = await dexs(() => getJson<DexPair[]>(`${DEXS_TOKENS}/${todo.join(",")}`, 5000)).catch(() => null);
      if (!Array.isArray(pairs)) return;
      for (const m of todo) { const mine = pairs.filter((p) => p?.baseToken?.address === m); rawC.set(`dex:${m}`, { at: Date.now(), v: Promise.resolve(mine) }); }
    });
  }

  /** Compact market numbers for the token pills in view: one DexScreener call for up to 30 mints (shared with the popup's
   *  cache), pump.fun's coin record for a pump coin DexScreener has no pair for yet (at most 4 per call). Kept 45 s per mint. */
  const STATS_TTL = 45_000;
  const statsGate = gate(1500);
  async function stats(mints: string[]): Promise<PillStats[]> {
    const list = [...new Set(mints.filter((m) => isPubkey(m) && !NOT_TOKENS.has(m)))].slice(0, 30);
    const fresh = (k: string) => { const c = rawC.get(k); return c && Date.now() - c.at < STATS_TTL ? c : null; };
    const infoFresh = (m: string) => { const c = infoC.get(m) as { v: CaInfo & { partial?: boolean }; at: number } | undefined; return c && !c.v.partial && Date.now() - c.at < STATS_TTL ? c.v : null; };
    const todo = list.filter((m) => !fresh(`dex:${m}`) && !infoFresh(m));
    if (todo.length) await statsGate(async () => {
      const left = todo.filter((m) => !fresh(`dex:${m}`)); // another call may have fetched them meanwhile
      if (!left.length) return;
      const pairs = await dexs(() => getJson<DexPair[]>(`${DEXS_TOKENS}/${left.join(",")}`, 5000)).catch(() => null);
      if (!Array.isArray(pairs)) return;
      for (const m of left) rawC.set(`dex:${m}`, { at: Date.now(), v: Promise.resolve(pairs.filter((p) => p?.baseToken?.address === m)) });
    }).catch(() => {});
    let pumpN = 0;
    const pick = (m: string, v: CaInfo): PillStats => ({ mint: m, mcapUsd: v.mcapUsd, volume24hUsd: v.volume24hUsd, liquidityUsd: v.liquidityUsd });
    return Promise.all(list.map(async (m): Promise<PillStats> => {
      const iv = infoFresh(m);
      if (iv) return pick(m, iv);
      const pairs = await (fresh(`dex:${m}`)?.v ?? Promise.resolve(null)).catch(() => null);
      const dex = topPair(Array.isArray(pairs) ? (pairs as DexPair[]) : null, m);
      if (dex) return pick(m, mergeInfo(m, { dex, siteUrl: "" }));
      if (m.endsWith("pump") && pumpN++ < 4) {
        const pf = await raw(`pf:${m}`, () => pumpCoin(m), 60_000).catch(() => null);
        if (pf) return pick(m, mergeInfo(m, { pump: pf, siteUrl: "" }));
      }
      return { mint: m, mcapUsd: null, volume24hUsd: null, liquidityUsd: null };
    }));
  }

  /** Token audit from chain data through the configured RPC (the highbar /rpc by default): mint and freeze authority,
   *  the top 10 holders' share (getTokenLargestAccounts; "—" while the /rpc allowlist refuses it), and the LP state: a coin
   *  on its bonding curve (pump.fun not complete, highbar DBC not migrated) has none yet, a PumpSwap pool's LP burn is read
   *  from the pool and its LP mint. Free, no third-party API. Kept 60 s per mint. */
  const auditC = new Map<string, { at: number; v: Promise<TokenAudit> }>();
  const auditGate = gate(120);
  function audit(mint: string): Promise<TokenAudit> {
    if (!isPubkey(mint) || NOT_TOKENS.has(mint)) return Promise.reject(new Error("That is not a token address"));
    const c = auditC.get(mint);
    if (c && Date.now() - c.at < 60_000) return c.v;
    const v = loadAudit(mint);
    auditC.set(mint, { at: Date.now(), v });
    v.catch(() => auditC.delete(mint));
    if (auditC.size > 100) for (const [k, x] of auditC) if (Date.now() - x.at > 60_000) auditC.delete(k);
    return v;
  }
  async function loadAudit(mint: string): Promise<TokenAudit> {
    const R = await d.rpc();
    const call = <T>(m: string, p: unknown[]) => auditGate(() => R.call<T>(m, p));
    const pfP = within(raw(`pf:${mint}`, () => pumpCoin(mint), 60_000).catch(() => null), 2500);
    const hbP = within(raw(`hb:${mint}`, () => hbToken(mint)).catch(() => null), 2500);
    const largestP = call<{ value: unknown[] }>("getTokenLargestAccounts", [mint, { commitment: "confirmed" }]).then((r) => r.value)
      .catch((e) => { if (!notAllowed(e)) console.debug("highbar: largest accounts", String((e as Error)?.message ?? e)); return null; });
    const [pfR, hbR] = await Promise.all([pfP, hbP]);
    const pf = pfR === TIMEOUT ? null : pfR, hb = hbR === TIMEOUT ? null : hbR;
    let pool: string | null = pf?.pump_swap_pool && isPubkey(pf.pump_swap_pool) ? pf.pump_swap_pool : null;
    if (!pool) {
      const pairs = await (rawC.get(`dex:${mint}`)?.v ?? Promise.resolve(null)).catch(() => null);
      const ps = Array.isArray(pairs) ? (pairs as DexPair[]).find((x) => x?.baseToken?.address === mint && x.dexId === "pumpswap") : null;
      if (ps?.pairAddress && isPubkey(ps.pairAddress)) pool = ps.pairAddress;
    }
    const accs = await call<{ value: ({ owner?: string; data?: unknown } | null)[] }>("getMultipleAccounts", [pool ? [mint, pool] : [mint], { encoding: "jsonParsed", commitment: "confirmed" }]);
    const m = parseMint(accs?.value?.[0]);
    if (!m) throw new Error("Not a token mint");
    let lp: LpState = null, burnt: number | null = null;
    if (hb && hb.isMigrated === false) lp = "curve";
    else if (pf && pumpLaunched(pf) && pf.complete === false) lp = "curve";
    else if (pool && accs.value[1]?.owner === PUMPSWAP) {
      const raw64 = accs.value[1]?.data;
      const b64 = Array.isArray(raw64) && typeof raw64[0] === "string" ? raw64[0] : null;
      const ps = b64 ? parsePumpSwapPool(b64) : null;
      if (ps && bs58.encode(ps.baseMint) === mint) {
        const lm = await call<{ value: unknown }>("getAccountInfo", [bs58.encode(ps.lpMint), { encoding: "jsonParsed", commitment: "confirmed" }]).catch(() => null);
        burnt = lpBurntPct(parseMint(lm?.value)?.supply ?? null, ps.lpSupply);
        lp = burnt === null ? null : burnt >= 99 ? "burnt" : "partial";
      }
    }
    const largest = await largestP;
    return { mint, source: "onchain", noMint: m.mintAuthority === null, noFreeze: m.freezeAuthority === null, lp, lpBurntPct: burnt, top10Pct: top10(largest, m.supply), t22: m.t22, at: Date.now() };
  }

  async function info(mint: string, fresh = false): Promise<CaInfo & { partial?: boolean }> {
    if (!isPubkey(mint) || NOT_TOKENS.has(mint)) throw new Error("That is not a token address");
    const c = infoC.get(mint) as { v: CaInfo & { partial?: boolean }; at: number } | undefined;
    // partial answers are kept 1 s only, so the popup's next ask picks up the late sources
    if (c && Date.now() - c.at < (c.v.partial ? 1000 : fresh ? 8_000 : 15_000)) return c.v.image ? c.v : { ...c.v, image: imgC.get(mint)?.v ?? null };
    const f = inflight.get(mint);
    if (f) return f;
    const p = load(mint).then((v) => { infoC.set(mint, { v, at: Date.now() }); return v; }).finally(() => inflight.delete(mint));
    inflight.set(mint, p);
    return p;
  }

  return { check, ticker, info, prefetch, stats, audit, hbToken, caFromUrl, pumpCoin };
}
export type CaService = ReturnType<typeof caService>;
