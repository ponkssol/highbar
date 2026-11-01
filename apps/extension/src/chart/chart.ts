/** chart.html: the CA popup's chart (an extension page, because x.com's CSP blocks third party frames and connections).
 *  Candles come from the worker (ca:candles: highbar api, pump.fun, GeckoTerminal or live 1 s bars from price ticks) and are drawn with TradingView's
 *  lightweight-charts (Apache-2.0, bundled; its attribution logo links to tradingview.com, see licenses/). The page polls while
 *  it is visible: every second on pump.fun, slower elsewhere, with backoff on errors; closing the popup removes the frame and
 *  with it every timer. Only base58 addresses get through, so the page cannot be pointed anywhere else. When no source has
 *  bars, a pool still gets the GeckoTerminal embed as the last fallback. */
import { CandlestickSeries, ColorType, createChart, CrosshairMode, HistogramSeries, type IChartApi, type ISeriesApi, type UTCTimestamp } from "lightweight-charts";
import { chartEmbedUrl, isPubkey } from "../lib/ca";
import { backoff, fmtPrice, isRes, mergeBars, RES_LIST, SOURCE_LABEL, type Bar, type CandleReply, type ChartSource, type Res } from "../lib/candles";

const q = new URLSearchParams(location.search);
const mint = q.get("mint") ?? "", pool = q.get("pool") ?? "", hb = q.get("hb") === "1", pf = q.get("pf") === "1";
const box = document.getElementById("c")!, bar = document.getElementById("bar")!, tf = document.getElementById("tf")!, src = document.getElementById("src")!, msg = document.getElementById("msg")!;
const GOLD = "#FFC72C", UP = "#4CB67A", DN = "#E06A5C";

type Reply<T> = { ok: true; data: T } | { ok: false; error: string; code?: string };
const ask = (m: Record<string, unknown>) => new Promise<CandleReply>((res, rej) => {
  chrome.runtime.sendMessage(m, (r: Reply<CandleReply> | undefined) => {
    const e = chrome.runtime.lastError;
    if (e || !r) return rej(Object.assign(new Error(e?.message ?? "No answer"), { code: "retry" }));
    if (r.ok) res(r.data); else rej(Object.assign(new Error(r.error), { code: r.code }));
  });
});

let chart: IChartApi | null = null, candles: ISeriesApi<"Candlestick"> | null = null, vol: ISeriesApi<"Histogram"> | null = null;
// 1 s first for coins pump.fun knows (its own 1 s candles) and for tokens with no pool (live 1 s bars only)
let res: Res = (pf || mint.endsWith("pump") || !pool) && !hb ? "1s" : "1m", source: ChartSource | null = null, supported: Res[] = [...RES_LIST];
let note: string | null = null, live = false;
let auto = true; // the width is still the default one: the worker may open on another (see ca:candles auto)
let bars: Bar[] = [], errors = 0, timer: ReturnType<typeof setTimeout> | null = null, gen = 0, stopped = false;

function ensureChart() {
  if (chart) return;
  chart = createChart(box, {
    autoSize: true,
    layout: { background: { type: ColorType.Solid, color: "#0F0E0B" }, textColor: "#958C79", fontSize: 10, fontFamily: "Inter, system-ui, sans-serif", attributionLogo: true },
    grid: { vertLines: { color: "rgba(255,236,200,.04)" }, horzLines: { color: "rgba(255,236,200,.05)" } },
    rightPriceScale: { borderColor: "rgba(255,236,200,.08)", scaleMargins: { top: 0.1, bottom: 0.24 } },
    timeScale: { borderColor: "rgba(255,236,200,.08)", timeVisible: true, secondsVisible: true, rightOffset: 3, barSpacing: 6 },
    crosshair: { mode: CrosshairMode.Normal, vertLine: { color: "rgba(255,199,44,.35)", labelBackgroundColor: "#3A3424" }, horzLine: { color: "rgba(255,199,44,.35)", labelBackgroundColor: "#3A3424" } },
    localization: { priceFormatter: fmtPrice },
    handleScale: { axisPressedMouseMove: { time: true, price: false } },
  });
  candles = chart.addSeries(CandlestickSeries, { upColor: UP, downColor: DN, borderUpColor: UP, borderDownColor: DN, wickUpColor: UP, wickDownColor: DN,
    priceFormat: { type: "custom", formatter: fmtPrice, minMove: 1e-12 }, priceLineColor: GOLD });
  vol = chart.addSeries(HistogramSeries, { priceFormat: { type: "volume" }, priceScaleId: "", lastValueVisible: false, priceLineVisible: false });
  vol.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
}

function draw(full: boolean) {
  ensureChart();
  const c = bars.map((b) => ({ time: b.time as UTCTimestamp, open: b.open, high: b.high, low: b.low, close: b.close }));
  const v = bars.map((b) => ({ time: b.time as UTCTimestamp, value: b.volume, color: b.close >= b.open ? "rgba(76,182,122,.45)" : "rgba(224,106,92,.45)" }));
  if (full) { candles!.setData(c); vol!.setData(v); chart!.timeScale().scrollToRealTime(); return; }
  candles!.setData(c); vol!.setData(v);
}

function drawBar() {
  tf.replaceChildren(...RES_LIST.map((r) => {
    const b = document.createElement("button");
    b.type = "button"; b.textContent = r; b.className = r === res ? "on" : "";
    b.disabled = !supported.includes(r);
    b.title = b.disabled ? `${r} is not available from ${source ? SOURCE_LABEL[source] : "this source"}` : `${r} candles`;
    b.setAttribute("aria-pressed", String(r === res));
    b.addEventListener("click", () => { if (r !== res && !b.disabled) { res = r; auto = false; bars = []; errors = 0; void tick(true); } });
    return b;
  }));
  // the source, honestly: live 1 s bars are built from price ticks, GeckoTerminal's last bar moves with them, and a skipped
  // better source says why ("pump.fun blocked (403) → GeckoTerminal")
  const lbl = !source ? "" : source === "live" ? "1s · live from Jupiter price" : source === "geckoterminal" && live ? "GeckoTerminal · last bar live" : SOURCE_LABEL[source];
  src.textContent = !source ? "" : note ? `${note} → ${source === "live" ? "live price bars" : SOURCE_LABEL[source]}` : `Chart data: ${lbl}`;
  src.title = note ? `Chart data: ${lbl}. ${note}` : `Chart data: ${lbl}`;
  src.classList.toggle("warn", !!note);
}

function schedule(ms: number) {
  if (timer) clearTimeout(timer);
  if (stopped) return;
  timer = setTimeout(() => { if (document.visibilityState === "visible") void tick(false); else schedule(ms); }, ms);
}

function embedFallback(reason: string) {
  stopped = true;
  if (timer) clearTimeout(timer);
  chart?.remove(); chart = null;
  bar.hidden = true;
  if (!isPubkey(pool)) { msg.textContent = "No chart yet for this token"; msg.hidden = false; return; }
  const f = document.createElement("iframe");
  f.src = chartEmbedUrl(pool, "dark", "15m"); f.title = "Price chart (GeckoTerminal)"; f.referrerPolicy = "no-referrer";
  box.replaceChildren(f);
  document.body.dataset.fallback = reason.slice(0, 200);
}

async function tick(full: boolean) {
  const my = ++gen;
  if (full) { msg.textContent = "Loading chart…"; msg.hidden = false; }
  try {
    const r = await ask({ type: "ca:candles", mint, pool: pool || null, highbar: hb, res, count: full || !bars.length ? 300 : 5, source, auto: auto && !bars.length, pump: pf });
    if (my !== gen) return;
    const changed = r.source !== source || r.res !== res;
    source = r.source; supported = r.supported; errors = 0; note = r.note ?? null; live = r.live === true;
    if (r.res !== res) { res = r.res; bars = []; }
    bars = full || changed ? mergeBars([], r.bars) : mergeBars(bars, r.bars);
    msg.hidden = true;
    draw(full || changed);
    drawBar();
    document.body.dataset.source = source; document.body.dataset.res = res; document.body.dataset.bars = String(bars.length);
    schedule(r.pollMs);
  } catch (e) {
    if (my !== gen) return;
    if ((e as { code?: string }).code === "nochart" && !bars.length) { embedFallback((e as Error).message); return; }
    errors++;
    if ((e as { code?: string }).code === "nochart") source = null; // the source we had stopped answering: look again
    schedule(backoff(source === "pump.fun" ? 1000 : 3000, errors));
  }
}

addEventListener("pagehide", () => { stopped = true; if (timer) clearTimeout(timer); });
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && !stopped && bars.length) void tick(false); });

if (!isPubkey(mint)) { msg.textContent = "No chart for this token"; bar.hidden = true; }
else { drawBar(); void tick(true); }
