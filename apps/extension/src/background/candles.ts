/** Market data that moves, for the open CA popup: candles for chart.html and the live price and stats for the popup header.
 *  Every fetch is the worker's (host permissions or CORS-open public APIs; extension pages and x.com fetch nothing themselves).
 *
 *  Candles, first source with bars wins: highbar api (highbar tokens), pump.fun (any mint pump.fun has candles for, 1 s bars,
 *  bonding curve and PumpSwap), GeckoTerminal (minute OHLCV of the top pool, its last bar kept current with the live price),
 *  then "live": 1 s bars built here from live price ticks for tokens pump.fun has nothing for.
 *  Live price: the newest pump.fun 1 s close when pump.fun has the coin (the chart polls it every second anyway), else
 *  Jupiter's price v3 (about 5 s fresh). Stats (24h volume, liquidity, change, supply for the market cap): DexScreener.
 *
 *  Request budget for one open popup (only the open popup polls; closing it stops every timer):
 *    pump.fun candles   1/s  = 60/min   (pump.fun's limit: 600/min per IP, x-ratelimit-limit; its CDN caches 5 s)
 *    Jupiter price v3   1/3s = 20/min   (keyless tier; non-pump tokens only)
 *    DexScreener tokens 1/10s = 6/min   (documented 300/min; its CDN caches 30 s, so faster is pointless)
 *    GeckoTerminal OHLCV <= 5/min       (free tier ~30/min; 12 s cache, one call per 2.5 s at most) */
import { chartSources, isPumpMint, RES_LIST, gtOhlcvUrl, hbCandlesPath, isRes, parseGt, parseHb, parsePump, patchLive, POLL_MS, pumpCandlesUrl, RES_SEC, servedRes, SOURCE_LABEL, SOURCE_RES,
  ticksToBars, type Bar, type CandleReply, type ChartSource, type Res } from "../lib/candles";
import { isPubkey } from "../lib/ca";
import type { Api } from "../lib/api";
import type { LiveStats } from "../lib/messages";
import { DEXS_TOKENS, gate, topPair, type DexPair } from "./ca";

export const JUP_PRICE = "https://api.jup.ag/price/v3";
export interface CandleReq { mint: string; pool?: string | null; highbar?: boolean; res: Res; count?: number; source?: ChartSource | null; auto?: boolean; pump?: boolean }

async function getJson(url: string, ms = 8000): Promise<unknown> {
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { credentials: "omit", signal: ctl.signal, headers: { accept: "application/json" } });
    if (!r.ok) {
      const ct = r.headers.get("content-type") ?? "", cf = r.headers.get("cf-mitigated");
      // Cloudflare's challenge is HTML with a 403 (cf-mitigated: challenge); pump.fun's own CORS refusal is JSON with a 403
      throw Object.assign(new Error(`HTTP ${r.status}${cf ? ` (Cloudflare ${cf})` : ct.includes("html") ? " (Cloudflare page)" : ""}`), { status: r.status });
    }
    return await r.json();
  } catch (e) {
    if ((e as Error).name === "AbortError") throw new Error("timed out");
    if (e instanceof TypeError) throw new Error("blocked (network or CORS)");
    throw e;
  } finally { clearTimeout(t); }
}
const num = (v: unknown): number | null => { const n = typeof v === "string" ? Number(v) : (v as number); return typeof n === "number" && Number.isFinite(n) ? n : null; };

export function candleService(d: { api: Api }) {
  const gates: Record<ChartSource, ReturnType<typeof gate>> = { "pump.fun": gate(150), highbar: gate(300), geckoterminal: gate(2500), live: gate(0) };
  const cacheMs: Record<ChartSource, number> = { "pump.fun": 800, highbar: 2000, geckoterminal: 12_000, live: 0 };
  const jupGate = gate(1000), dexGate = gate(250);
  const cache = new Map<string, { at: number; v: Promise<Bar[] | null> }>();
  /** pump.fun answered no candles for this mint: skip it for 10 minutes. */
  const pumpEmpty = new Map<string, number>();
  /** Mints pump.fun launched (the popup says so, or the address ends in "pump"): only these get pump.fun candles and ticks.
   *  pump.fun also indexes other tokens ("non_launchpad"), but sparsely, so those use GeckoTerminal and live ticks. */
  const pumpKnown = new Map<string, number>();
  /** pump.fun refused (Cloudflare, 403, network or CORS): not asked again for a minute, and the chart says why. */
  const pumpErr = new Map<string, { note: string; at: number }>();
  const pumpDown = (mint: string) => { const e = pumpErr.get(mint); return e && Date.now() - e.at < 60_000 ? e.note : null; };
  const pumpNote = (m: string) => (/timed out/.test(m) ? "pump.fun timed out" : `pump.fun blocked (${m.match(/HTTP (\d+)/)?.[1] ?? m.replace(/^blocked \((.*)\)$/, "$1")})`);
  const isPumpCoin = (mint: string) => isPumpMint(mint) || Date.now() - (pumpKnown.get(mint) ?? 0) < 30 * 60_000;
  /** Live price ticks per mint (unix ms, USD), newest last, for 1 s bars and for the GeckoTerminal last bar. */
  const ticks = new Map<string, { t: number; p: number }[]>();
  const lastUse = new Map<string, number>();
  /** When pump.fun last answered 1 s bars for a mint (its newest close is then the live price). */
  const pumpAt = new Map<string, number>();
  /** Last failure per source, for Diagnostics and the chart's footnote. */
  const lastError: Partial<Record<ChartSource, string>> = {};
  const jupC = new Map<string, { at: number; v: Promise<{ p: number; chg: number | null; liq: number | null } | null> }>();
  const dexC = new Map<string, { at: number; v: Promise<DexPair | null> }>();

  const addTick = (mint: string, t: number, p: number) => {
    if (!(p > 0)) return;
    const l = ticks.get(mint) ?? [];
    const last = l[l.length - 1];
    if (last && t <= last.t) { if (t === last.t) last.p = p; return; }
    l.push({ t, p }); if (l.length > 1800) l.splice(0, l.length - 1800);
    ticks.set(mint, l); lastUse.set(mint, Date.now());
    // forget mints nobody looked at for 5 minutes
    if (ticks.size > 20) for (const [m, at] of lastUse) if (Date.now() - at > 5 * 60_000) { ticks.delete(m); lastUse.delete(m); }
  };
  const lastTick = (mint: string) => { const l = ticks.get(mint); return l?.length ? l[l.length - 1] : null; };

  const cached = (src: ChartSource, key: string, fn: () => Promise<Bar[] | null>) => {
    const c = cache.get(key);
    if (c && Date.now() - c.at < cacheMs[src]) return c.v;
    const v = gates[src](fn);
    cache.set(key, { at: Date.now(), v });
    v.catch(() => cache.delete(key));
    if (cache.size > 200) for (const [k, x] of cache) if (Date.now() - x.at > 60_000) cache.delete(k);
    return v;
  };

  /** pump.fun 1 s candles; the newest close is also the live price. */
  const pumpBars = (mint: string, res: Res, count: number) => {
    const u = pumpCandlesUrl(mint, res, count);
    return cached("pump.fun", u, async () => {
      let j: unknown;
      // pump.fun answers 404/400 (JSON) for a coin it does not know: that is "no bars", not a blocked source
      try { j = await getJson(u, 6000); } catch (e) { const st = (e as { status?: number }).status; if ((st === 404 || st === 400) && !String((e as Error).message).includes("Cloudflare")) { pumpEmpty.set(`${mint}|*`, Date.now()); return []; } pumpErr.set(mint, { note: pumpNote(String((e as Error).message)), at: Date.now() }); throw e; }
      pumpErr.delete(mint);
      const b = parsePump(j, res);
      // no bars at this width (pump.fun indexes many tokens, but 1 s often only for its own coins): skip that width only
      if (b && !b.length && count >= 2) pumpEmpty.set(`${mint}|${res}`, Date.now());
      if (b?.length && res === "1s") { const l = b[b.length - 1]; addTick(mint, Math.min(Date.now(), (l.time + 1) * 1000), l.close); pumpAt.set(mint, Date.now()); }
      return b;
    });
  };
  const pumpSkip = (mint: string, res?: Res) => [`${mint}|*`, ...(res ? [`${mint}|${res}`] : [])].some((k) => { const at = pumpEmpty.get(k); return at !== undefined && Date.now() - at < 10 * 60_000; });

  /** Jupiter price v3 (3 s cache: its CDN serves the same answer for 5 s). */
  const jupPrice = (mint: string) => {
    const c = jupC.get(mint);
    if (c && Date.now() - c.at < 3000) return c.v;
    const v = jupGate(async () => {
      const r = (await getJson(`${JUP_PRICE}?ids=${mint}`, 4000)) as Record<string, { usdPrice?: number; priceChange24h?: number; liquidity?: number }>;
      const x = r?.[mint]; const p = num(x?.usdPrice);
      if (p === null || p <= 0) return null;
      addTick(mint, Date.now(), p);
      return { p, chg: num(x?.priceChange24h), liq: num(x?.liquidity) };
    }).catch(() => null);
    jupC.set(mint, { at: Date.now(), v });
    return v;
  };
  /** DexScreener's top pair (10 s cache; its CDN caches 30 s). */
  const dexPair = (mint: string) => {
    const c = dexC.get(mint);
    if (c && Date.now() - c.at < 10_000) return c.v;
    const v = dexGate(async () => topPair((await getJson(`${DEXS_TOKENS}/${mint}`, 4000)) as DexPair[], mint)).catch(() => null);
    dexC.set(mint, { at: Date.now(), v });
    return v;
  };

  /** The live tick for a mint: pump.fun's newest 1 s close when fresh, else Jupiter. */
  async function freshTick(mint: string): Promise<{ t: number; p: number; src: "pump.fun" | "jupiter" } | null> {
    const lt = lastTick(mint);
    if (isPumpCoin(mint) && !pumpSkip(mint, "1s") && !pumpDown(mint)) {
      if (lt && Date.now() - (pumpAt.get(mint) ?? 0) < 1500) return { ...lt, src: "pump.fun" };
      try { const b = await pumpBars(mint, "1s", 2); if (b?.length && lastTick(mint)) return { ...lastTick(mint)!, src: "pump.fun" }; } catch { /* fall to Jupiter */ }
    }
    const j = await jupPrice(mint);
    return j ? { t: lastTick(mint)?.t ?? Date.now(), p: j.p, src: "jupiter" } : null;
  }

  /** Header numbers for the open popup, polled every second by the content script. */
  async function live(mint: string): Promise<LiveStats> {
    if (!isPubkey(mint)) throw new Error("Bad mint");
    lastUse.set(mint, Date.now());
    const [tk, dex] = await Promise.all([freshTick(mint), dexPair(mint)]);
    const dexP = num(dex?.priceUsd), dexMc = num(dex?.marketCap) ?? num(dex?.fdv);
    const supply = dexP && dexMc ? dexMc / dexP : null;
    const price = tk?.p ?? dexP;
    const j = tk?.src === "jupiter" ? await jupPrice(mint) : null;
    return {
      mint, priceUsd: price, priceAt: tk?.t ?? null, source: tk?.src ?? (dexP ? "dexscreener" : null),
      mcapUsd: price !== null && supply ? price * supply : dexMc,
      change24h: num(dex?.priceChange?.h24) ?? j?.chg ?? null,
      volume24hUsd: num(dex?.volume?.h24), liquidityUsd: num(dex?.liquidity?.usd) ?? j?.liq ?? null,
      at: Date.now(),
    };
  }

  async function from(src: ChartSource, q: CandleReq, res: Res, count: number): Promise<Bar[] | null> {
    if (src === "pump.fun") return pumpBars(q.mint, res, count);
    if (src === "geckoterminal") {
      const u = q.pool ? gtOhlcvUrl(q.pool, res, count, q.mint) : null;
      if (!u) return null;
      const b = await cached(src, u, async () => parseGt(await getJson(u)));
      if (!b?.length) return b;
      // keep the last minute moving between GeckoTerminal refreshes
      const t = await freshTick(q.mint).catch(() => null);
      return patchLive(b, t && Date.now() - t.t < 15_000 ? t : null, RES_SEC[res]);
    }
    if (src === "live") {
      if (res !== "1s") return null;
      await freshTick(q.mint);
      const b = ticksToBars(ticks.get(q.mint) ?? [], 1);
      return b.length ? b : null;
    }
    const p = hbCandlesPath(q.mint, res, count);
    return p ? cached(src, `hb:${q.mint}:${res}:${count}`, async () => parseHb(await d.api.get(p))) : null;
  }

  async function candles(q: CandleReq): Promise<CandleReply> {
    if (!isPubkey(q?.mint) || (q.pool && !isPubkey(q.pool)) || !isRes(q.res)) throw new Error("Bad chart request");
    const count = Math.max(2, Math.min(300, Math.floor(Number(q.count) || 300)));
    if (q.pump === true) pumpKnown.set(q.mint, Date.now());
    const all = chartSources(q.mint, { highbar: q.highbar === true, pool: q.pool ?? null, pumpEmpty: pumpSkip(q.mint) || !isPumpCoin(q.mint) || !!pumpDown(q.mint) });
    // widths a source can draw for this token (pump.fun minus the widths it had no bars for)
    const widths = (s: ChartSource) => SOURCE_RES[s].filter((r) => !(s === "pump.fun" && pumpSkip(q.mint, r)));
    const serves = (s: ChartSource) => widths(s).includes(q.res);
    // a source that only serves other widths comes after those that serve this one (1 s: pump.fun, then live)
    let ordered: ChartSource[] = [...all.filter(serves), ...all.filter((s) => !serves(s) && s !== "live" && widths(s).length)];
    // the chart's first, default width: when no source has real 1 s candles, a 1 s view that only live ticks could fill (a
    // few seconds of them) opens on 1 m history instead; the 1 s button stays available
    if (q.auto && q.res === "1s" && ordered.length > 1) ordered = [...ordered.filter((s) => s !== "live"), "live"];
    const order = q.source && ordered.includes(q.source) ? [q.source, ...ordered.filter((s) => s !== q.source)] : ordered;
    const tried: string[] = [];
    let note: string | null = isPumpCoin(q.mint) ? pumpDown(q.mint) : null;
    for (const src of order) {
      const w = widths(src), res = w.includes(q.res) ? q.res : w.includes("1m") ? "1m" : w[0] ?? servedRes(src, q.res);
      try {
        const bars = await from(src, q, res, count);
        if (bars && bars.length) {
          delete lastError[src];
          // every width some source here can draw (pump.fun's widths minus those it had no bars for, the pool's, live 1 s)
          const supported = RES_LIST.filter((r) => all.some((s) => widths(s).includes(r)));
          return { source: src, res, bars, supported, pollMs: POLL_MS[src], tried, note, live: src === "live" || src === "geckoterminal" };
        }
        tried.push(`${src}: no bars`);
      } catch (e) {
        const m = (e as Error).message;
        lastError[src] = m; tried.push(`${src}: ${m}`);
        if (src === "pump.fun" && !note) note = pumpNote(m);
      }
      // the chart already had this source: a failed poll is retried with backoff before it falls back
      if (q.source === src && q.count !== undefined && q.count < 300) throw Object.assign(new Error(tried[tried.length - 1]), { code: "retry" });
    }
    throw Object.assign(new Error(tried.length ? `No chart data (${tried.join("; ")})` : "No chart source for this token"), { code: "nochart" });
  }

  return { candles, live, lastError, label: SOURCE_LABEL };
}
