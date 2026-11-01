/** CA popup data in the worker (x.com's CSP lets the content script fetch nothing itself). Sources, first that knows the token:
 *  the highbar api (/tokens/:mint, the token's own pool and stats), Jupiter's token search (name, icon, USD price, market cap,
 *  24h change and volume, verified), DexScreener (top pool, 24h volume and change, market cap) and GeckoTerminal (a pool for the
 *  chart when DexScreener has none). Answers are cached: mint checks for an hour, tickers for ten minutes, token data 15 s. */
import { caFromUrl, isMintAccount, isPubkey, NOT_TOKENS, pickTicker, type CaHit, type CaInfo, type TickerCandidate } from "../lib/ca";
import type { Api } from "../lib/api";
import type { Rpc } from "../lib/rpc";
import { thumbFromUrl, tokenThumb } from "./image";

export const JUP_TOKENS = "https://api.jup.ag/tokens/v2/search";
export const DEXS_TOKENS = "https://api.dexscreener.com/tokens/v1/solana";
export const DEXS_PAIRS = "https://api.dexscreener.com/latest/dex/pairs/solana";
export const GT_POOLS = "https://api.geckoterminal.com/api/v2/networks/solana/tokens";

export interface JupToken { id: string; name?: string; symbol?: string; icon?: string; decimals?: number; usdPrice?: number; mcap?: number; fdv?: number; liquidity?: number;
  isVerified?: boolean; tokenProgram?: string; stats24h?: { priceChange?: number; buyVolume?: number; sellVolume?: number } }
export interface DexPair { pairAddress?: string; dexId?: string; priceUsd?: string; priceChange?: { h24?: number }; volume?: { h24?: number }; liquidity?: { usd?: number }; marketCap?: number; fdv?: number;
  baseToken?: { address?: string; name?: string; symbol?: string }; quoteToken?: { address?: string }; info?: { imageUrl?: string } }
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
export function mergeInfo(mint: string, x: { hb?: HbToken | null; jup?: JupToken | null; dex?: DexPair | null; gtPool?: string | null; image?: string | null; siteUrl: string }): CaInfo {
  const { hb, jup, dex } = x;
  const solUsd = hb && hb.mcapSol > 0 && hb.mcapUsd > 0 ? hb.mcapUsd / hb.mcapSol : null;
  const vol = jup?.stats24h ? (num(jup.stats24h.buyVolume) ?? 0) + (num(jup.stats24h.sellVolume) ?? 0) : null;
  const sources = [hb && "highbar", jup && "jupiter", dex && "dexscreener", x.gtPool && "geckoterminal"].filter((s): s is string => !!s);
  const hbPrice = hb && solUsd !== null ? hb.priceSol * solUsd : null;
  return {
    mint,
    name: hb?.name || jup?.name || dex?.baseToken?.name || "Unknown token",
    symbol: hb?.symbol || jup?.symbol || dex?.baseToken?.symbol || "?",
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
  const jup = gate(2100), dexs = gate(250), gt = gate(2100), rpcGate = gate(1000);
  const mintC = new Map<string, { v: string | null; at: number }>();
  const tickC = new Map<string, { v: CaHit | null; at: number }>();
  const infoC = new Map<string, { v: CaInfo; at: number }>();
  const imgC = new Map<string, string | null>();
  const hbC = new Map<string, { v: HbToken | null; at: number }>();
  const inflight = new Map<string, Promise<CaInfo>>();

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

  async function load(mint: string): Promise<CaInfo> {
    const site = await d.siteUrl();
    const [hb, jupT, pairs] = await Promise.all([
      hbToken(mint).catch(() => null),
      jup(() => getJson<JupToken[]>(`${JUP_TOKENS}?query=${mint}`)).then((l) => (Array.isArray(l) ? l.find((t) => t.id === mint) ?? null : null)).catch(() => null),
      dexs(() => getJson<DexPair[]>(`${DEXS_TOKENS}/${mint}`)).catch(() => null),
    ]);
    const dex = topPair(Array.isArray(pairs) ? pairs : null, mint);
    let gtPool: string | null = null;
    if (!dex && !hb?.pool) {
      try { const g = await gt(() => getJson<{ data?: { attributes?: { address?: string } }[] }>(`${GT_POOLS}/${mint}/pools?page=1`)); gtPool = g.data?.[0]?.attributes?.address ?? null; } catch { /* no chart pool */ }
    }
    if (!hb && !jupT && !dex && !gtPool) throw new Error("No market data for this token yet");
    let image = imgC.get(mint);
    if (image === undefined) {
      image = hb ? await tokenThumb(d.apiBase, mint, { siteUrl: site, image: hb.image ?? null, uri: hb.uri ?? null })
        : (jupT?.icon ? await thumbFromUrl(jupT.icon) : null) ?? (dex?.info?.imageUrl ? await thumbFromUrl(dex.info.imageUrl) : null);
      imgC.set(mint, image);
    }
    return mergeInfo(mint, { hb, jup: jupT, dex, gtPool, image, siteUrl: site });
  }

  async function info(mint: string, fresh = false): Promise<CaInfo> {
    if (!isPubkey(mint) || NOT_TOKENS.has(mint)) throw new Error("That is not a token address");
    const c = infoC.get(mint);
    if (c && Date.now() - c.at < (fresh ? 8_000 : 15_000)) return c.v;
    const f = inflight.get(mint);
    if (f) return f;
    const p = load(mint).then((v) => { infoC.set(mint, { v, at: Date.now() }); return v; }).finally(() => inflight.delete(mint));
    inflight.set(mint, p);
    return p;
  }

  return { check, ticker, info, hbToken, caFromUrl };
}
export type CaService = ReturnType<typeof caService>;
