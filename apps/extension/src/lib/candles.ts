/** Chart candles for the CA popup (pure, shared by the worker and chart.html; tested).
 *  Sources, first that has the token:
 *  - highbar api   GET <api>/tokens/:mint/candles?tf=1m|5m|15m (our own indexer, highbar tokens)
 *  - pump.fun      GET https://frontend-api-v3.pump.fun/candles/solana:<genesis>/<mint>?res=1s|1m|5m|15m&measure=price_usd&count=N
 *                  (the endpoint pump.fun's own chart uses; pump coins only, bonding curve and PumpSwap after migration)
 *                  Tried for EVERY mint: pump.fun also launches vanity mints that do not end in "pump" ($REGRET 5ZxT…7tWG), and
 *                  other mints answer an empty page (remembered for 10 minutes).
 *  - GeckoTerminal GET https://api.geckoterminal.com/api/v2/networks/solana/pools/<pool>/ohlcv/minute?aggregate=1|5|15
 *                  (any pool; its "second" timeframe is paid only), the last bar kept current with the live price
 *  - live          1s bars built in the worker from live price ticks (Jupiter price v3, ~5 s fresh) for tokens pump.fun has
 *                  no candles for, labeled as such */
export type Res = "1s" | "1m" | "5m" | "15m";
export type ChartSource = "highbar" | "pump.fun" | "geckoterminal" | "live";
export const RES_LIST: readonly Res[] = ["1s", "1m", "5m", "15m"];
export const RES_SEC: Record<Res, number> = { "1s": 1, "1m": 60, "5m": 300, "15m": 900 };
export const SOURCE_RES: Record<ChartSource, readonly Res[]> = { "pump.fun": ["1s", "1m", "5m", "15m"], highbar: ["1m", "5m", "15m"], geckoterminal: ["1m", "5m", "15m"], live: ["1s"] };
/** Poll period per source: pump.fun allows 600 requests a minute per IP (and its CDN caches a page for 5 s), GeckoTerminal's
 *  free tier about 30, our api is ours. */
export const POLL_MS: Record<ChartSource, number> = { "pump.fun": 1000, highbar: 3000, geckoterminal: 2000, live: 1000 };
export const SOURCE_LABEL: Record<ChartSource, string> = { "pump.fun": "pump.fun", highbar: "highbar", geckoterminal: "GeckoTerminal", live: "live trades price (Jupiter)" };
export const MAX_BARS = 1500;

export const PUMP_API = "https://frontend-api-v3.pump.fun";
/** CAIP-2 id of Solana mainnet, the chainId pump.fun's candle routes take. */
export const SOLANA_CAIP2 = "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp";
export const GT_API = "https://api.geckoterminal.com/api/v2/networks/solana/pools";

/** time is unix seconds (lightweight-charts' UTCTimestamp). */
export interface Bar { time: number; open: number; high: number; low: number; close: number; volume: number }
export interface CandleReply { source: ChartSource; res: Res; bars: Bar[]; supported: Res[]; pollMs: number; tried?: string[];
  /** Why a better source was skipped ("pump.fun blocked (HTTP 403)"), shown in the chart corner. */
  note?: string | null; live?: boolean }

const B58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
export const isRes = (r: unknown): r is Res => typeof r === "string" && (RES_LIST as readonly string[]).includes(r);
/** pump.fun mints are vanity addresses ending in "pump". */
export const isPumpMint = (mint: string) => B58.test(mint) && mint.endsWith("pump");

/** Sources to try for a token, best first. pump.fun for any mint (vanity mints exist); `pumpEmpty` when it had none lately. */
export function chartSources(mint: string, o: { highbar?: boolean; pool?: string | null; pumpEmpty?: boolean }): ChartSource[] {
  const out: ChartSource[] = [];
  if (!B58.test(mint)) return out;
  if (o.highbar) out.push("highbar");
  if (!o.pumpEmpty && !o.highbar) out.push("pump.fun"); // any mint: pump.fun coins need not end in "pump"
  if (o.pool && B58.test(o.pool)) out.push("geckoterminal");
  out.push("live");
  return out;
}
/** The width a source serves for a wanted width (GeckoTerminal and the api have no 1s: 1m). */
export const servedRes = (s: ChartSource, r: Res): Res => (SOURCE_RES[s].includes(r) ? r : SOURCE_RES[s][0]);

/** `before` (ms): one older page, candles that end before that time (pump.fun pages with `to`). */
export const pumpCandlesUrl = (mint: string, res: Res, count: number, before?: number) =>
  `${PUMP_API}/candles/${SOLANA_CAIP2}/${encodeURIComponent(mint)}?res=${res}&measure=price_usd&count=${Math.max(1, Math.min(300, Math.floor(count)))}${before && Number.isFinite(before) && before > 0 ? `&to=${Math.floor(before)}` : ""}`;
/** `token` (the mint) makes GeckoTerminal price that side of the pool, whichever side it is. */
export function gtOhlcvUrl(pool: string, res: Res, limit: number, token?: string): string | null {
  const agg = res === "1m" ? 1 : res === "5m" ? 5 : res === "15m" ? 15 : 0;
  if (!agg || !B58.test(pool)) return null;
  return `${GT_API}/${pool}/ohlcv/minute?aggregate=${agg}&limit=${Math.max(1, Math.min(1000, Math.floor(limit)))}&currency=usd${token && B58.test(token) ? `&token=${token}` : ""}`;
}
export function hbCandlesPath(mint: string, res: Res, count: number, now = Date.now()): string | null {
  if (res === "1s" || !B58.test(mint)) return null;
  const step = RES_SEC[res] * 1000;
  return `/tokens/${mint}/candles?tf=${res}&from=${Math.floor((now - Math.max(1, Math.min(1000, count)) * step) / step) * step}`;
}

const n = (v: unknown): number | null => { const x = typeof v === "string" ? Number(v) : v; return typeof x === "number" && Number.isFinite(x) ? x : null; };
const bar = (time: number | null, o: unknown, h: unknown, l: unknown, c: unknown, v: unknown): Bar | null => {
  const [O, H, L, C] = [n(o), n(h), n(l), n(c)];
  if (time === null || O === null || H === null || L === null || C === null || !(O > 0 && H > 0 && L > 0 && C > 0)) return null;
  return { time, open: O, high: Math.max(H, O, C), low: Math.min(L, O, C), close: C, volume: Math.max(0, n(v) ?? 0) };
};
/** Sorted by time, one bar per time (a later duplicate wins, except volume adds when `sum`), at most MAX_BARS (the newest). */
export function normalize(list: (Bar | null)[], sum = false): Bar[] {
  const m = new Map<number, Bar>();
  for (const b of list) {
    if (!b) continue;
    const p = m.get(b.time);
    m.set(b.time, p && sum ? { time: b.time, open: p.open, high: Math.max(p.high, b.high), low: Math.min(p.low, b.low), close: b.close, volume: p.volume + b.volume } : b);
  }
  return [...m.values()].sort((a, b) => a.time - b.time).slice(-MAX_BARS);
}

/** pump.fun: {candles:[{openTimeMs, open, high, low, close (decimal strings), volumeUsd}], served:{res}}. null when the body is
 *  not a candle page or pump.fun served another width (seconds older than its 7 day retention come back as 1m). */
export function parsePump(body: unknown, res: Res): Bar[] | null {
  const b = body as { candles?: unknown; served?: { res?: unknown } } | null;
  if (!b || typeof b !== "object" || !Array.isArray(b.candles)) return null;
  if (b.served?.res !== undefined && b.served.res !== res) return null;
  return normalize((b.candles as Record<string, unknown>[]).map((c) => bar(n(c?.openTimeMs) === null ? null : Math.floor(n(c.openTimeMs)! / 1000), c.open, c.high, c.low, c.close, c.volumeUsd)));
}
/** GeckoTerminal: data.attributes.ohlcv_list [[unix s, o, h, l, c, volume usd], ...] newest first, sometimes twice per bucket. */
export function parseGt(body: unknown): Bar[] | null {
  const l = (body as { data?: { attributes?: { ohlcv_list?: unknown } } } | null)?.data?.attributes?.ohlcv_list;
  if (!Array.isArray(l)) return null;
  return normalize(l.map((r) => (Array.isArray(r) ? bar(n(r[0]), r[1], r[2], r[3], r[4], r[5]) : null)), true);
}
/** highbar api: {candles:[{t ms, o,h,l,c (SOL), oUsd..cUsd, vUsd, vSol}]}; USD when the api knew SOL's price, else SOL. */
export function parseHb(body: unknown): Bar[] | null {
  const l = (body as { candles?: unknown } | null)?.candles;
  if (!Array.isArray(l)) return null;
  return normalize((l as Record<string, unknown>[]).map((c) => {
    const t = n(c?.t), usd = (n(c.cUsd) ?? 0) > 0;
    return bar(t === null ? null : Math.floor(t / 1000), usd ? c.oUsd : c.o, usd ? c.hUsd : c.h, usd ? c.lUsd : c.l, usd ? c.cUsd : c.c, usd ? c.vUsd : c.vSol);
  }));
}

/** Price ticks (unix ms, USD) to bars of `sec` seconds; volume unknown (0). */
export function ticksToBars(ticks: { t: number; p: number }[], sec = 1): Bar[] {
  const out: Bar[] = [];
  for (const k of [...ticks].sort((a, b) => a.t - b.t)) {
    if (!(k.p > 0) || !Number.isFinite(k.t)) continue;
    const time = Math.floor(k.t / 1000 / sec) * sec, last = out[out.length - 1];
    if (last && last.time === time) { last.high = Math.max(last.high, k.p); last.low = Math.min(last.low, k.p); last.close = k.p; }
    else out.push({ time, open: last ? last.close : k.p, high: Math.max(k.p, last ? last.close : k.p), low: Math.min(k.p, last ? last.close : k.p), close: k.p, volume: 0 });
  }
  return out.slice(-MAX_BARS);
}
/** The latest bar kept current with a live price: inside the last bar's window it moves close (and high/low), after it a new
 *  bar opens at the previous close. Ticks older than the last bar are ignored. */
export function patchLive(bars: Bar[], tick: { t: number; p: number } | null, sec: number): Bar[] {
  if (!tick || !(tick.p > 0) || !bars.length) return bars;
  const last = bars[bars.length - 1], time = Math.floor(tick.t / 1000 / sec) * sec;
  if (time < last.time) return bars;
  if (time === last.time) return [...bars.slice(0, -1), { ...last, close: tick.p, high: Math.max(last.high, tick.p), low: Math.min(last.low, tick.p) }];
  return [...bars, { time, open: last.close, high: Math.max(last.close, tick.p), low: Math.min(last.close, tick.p), close: tick.p, volume: 0 }].slice(-MAX_BARS);
}

/** New bars into the series: same time replaces (the forming bar), newer appends. */
export function mergeBars(old: Bar[], add: Bar[]): Bar[] {
  if (!old.length) return normalize(add);
  if (!add.length) return old;
  return normalize([...old, ...add]);
}

/** Next poll delay: the source's period, doubled per failed poll in a row, at most 30 s. */
export const backoff = (base: number, errors: number) => Math.min(30_000, base * 2 ** Math.min(6, Math.max(0, errors)));

/** Price label for tiny meme prices: 0.00001663 -> "0.0₄1663". */
export function fmtPrice(p: number): string {
  if (!Number.isFinite(p)) return "";
  if (p === 0) return "0";
  if (p >= 1000) return p.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (p >= 1) return p.toFixed(p >= 100 ? 2 : 3);
  if (p >= 0.01) return p.toFixed(4);
  const s = p.toFixed(20).slice(2), z = s.match(/^0*/)![0].length;
  const sub = String(z).split("").map((d) => "₀₁₂₃₄₅₆₇₈₉"[Number(d)]).join("");
  return `0.0${sub}${s.slice(z, z + 4).replace(/0+$/, "") || "0"}`;
}

/** Fills the seconds (or minutes) without trades with flat candles at the previous close, and carries the last close up to
 *  `now`, so a chart moves with the clock and shows real time instead of squeezing hours of sparse trades together.
 *  Keeps the newest `max` slots; a bar older than the window only seeds the first close. */
export function fillGaps(bars: Bar[], sec: number, nowSec: number, max = MAX_BARS): Bar[] {
  if (!bars.length || !(sec > 0)) return bars;
  const last = bars[bars.length - 1].time;
  const end = Math.max(last, Math.floor(nowSec / sec) * sec);
  const start = end - (max - 1) * sec;
  const out: Bar[] = [];
  let prev: Bar | null = null, j = 0;
  const n = bars.length;
  for (; j < n && bars[j].time < start; j++) prev = bars[j];
  if (!prev && j >= n) return bars.slice(-max);
  for (let t = prev ? start : bars[j].time; t <= end; t += sec) {
    while (j < n && bars[j].time < t) prev = bars[j++]; // a bar off the grid only carries its close
    if (j < n && bars[j].time === t) { prev = bars[j++]; out.push(prev); }
    else if (prev) out.push({ time: t, open: prev.close, high: prev.close, low: prev.close, close: prev.close, volume: 0 });
  }
  return out;
}
/** Bars that really traded inside the last `windowSec` (not counting fill). */
export const tradedIn = (bars: Bar[], nowSec: number, windowSec: number) => bars.reduce((n, b) => n + (b.time >= nowSec - windowSec && (b.volume ?? 0) > 0 ? 1 : 0), 0);
