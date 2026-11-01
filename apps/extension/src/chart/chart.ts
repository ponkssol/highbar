/** chart.html: the CA popup's chart, an extension page (x.com's CSP blocks third-party frames on its own pages).
 *  highbar's own minimal chart: candles only (no volume, no legend, no drawing tools), a row of small timeframe buttons.
 *  Candles come from the worker (ca:candles: highbar api, pump.fun, GeckoTerminal or live 1 s bars from price ticks) and are
 *  drawn with TradingView's lightweight-charts (Apache-2.0, bundled; no remote code). Its attribution is the small "TV" link
 *  in the bar and licenses/lightweight-charts.txt, instead of the logo inside the plot. The page polls while it is visible:
 *  every second on pump.fun, slower elsewhere, with backoff on errors; closing the popup removes the frame and with it every
 *  timer. Only base58 addresses get through, so the page cannot be pointed anywhere else. When no source has bars, a pool
 *  still gets the GeckoTerminal embed as the last fallback.
 *  Realtime: seconds (or minutes) without trades are drawn as flat candles at the last close and the chart is carried up to
 *  the current second on every poll (fillGaps), so it moves with the clock; polls only update the newest bars (series.update)
 *  instead of redrawing everything. No source label is drawn (diagnostics in Settings show the source). */
import { CandlestickSeries, ColorType, createChart, CrosshairMode, type IChartApi, type ISeriesApi, type UTCTimestamp } from "lightweight-charts";
import { chartEmbedUrl, isPubkey } from "../lib/ca";
import { backoff, fillGaps, fmtPrice, mergeBars, RES_LIST, RES_SEC, SOURCE_LABEL, tradedIn, type Bar, type CandleReply, type ChartSource, type Res } from "../lib/candles";

const q = new URLSearchParams(location.search);
const mint = q.get("mint") ?? "", pool = q.get("pool") ?? "", hb = q.get("hb") === "1", pf = q.get("pf") === "1";
const box = document.getElementById("c")!, bar = document.getElementById("bar")!, tf = document.getElementById("tf")!, msg = document.getElementById("msg")!;
const GOLD = "#FFC72C", UP = "#4CB67A", DN = "#E06A5C";

type Reply<T> = { ok: true; data: T } | { ok: false; error: string; code?: string };
const ask = (m: Record<string, unknown>) => new Promise<CandleReply>((res, rej) => {
  chrome.runtime.sendMessage(m, (r: Reply<CandleReply> | undefined) => {
    const e = chrome.runtime.lastError;
    if (e || !r) return rej(Object.assign(new Error(e?.message ?? "No answer"), { code: "retry" }));
    if (r.ok) res(r.data); else rej(Object.assign(new Error(r.error), { code: r.code }));
  });
});

let chart: IChartApi | null = null, candles: ISeriesApi<"Candlestick"> | null = null;
// 1 s first for coins pump.fun knows (its own 1 s candles) and for tokens with no pool (live 1 s bars only)
let res: Res = (pf || mint.endsWith("pump") || !pool) && !hb ? "1s" : "1m", source: ChartSource | null = null, supported: Res[] = [...RES_LIST];
let note: string | null = null, live = false;
let auto = true; // the width is still the default one: the worker may open on another (see ca:candles auto)
let bars: Bar[] = [], drawn = 0, errors = 0, timer: ReturnType<typeof setTimeout> | null = null, gen = 0, stopped = false;

function ensureChart() {
  if (chart) return;
  chart = createChart(box, {
    autoSize: true,
    layout: { background: { type: ColorType.Solid, color: "#0F0E0B" }, textColor: "#958C79", fontSize: 10, fontFamily: "Inter, system-ui, sans-serif", attributionLogo: false },
    grid: { vertLines: { visible: false }, horzLines: { color: "rgba(255,236,200,.04)" } },
    rightPriceScale: { borderColor: "rgba(255,236,200,.08)", scaleMargins: { top: 0.12, bottom: 0.08 } },
    timeScale: { borderColor: "rgba(255,236,200,.08)", timeVisible: true, secondsVisible: true, rightOffset: 3, barSpacing: 6 },
    crosshair: { mode: CrosshairMode.Normal, vertLine: { color: "rgba(255,199,44,.35)", labelBackgroundColor: "#3A3424" }, horzLine: { color: "rgba(255,199,44,.35)", labelBackgroundColor: "#3A3424" } },
    localization: { priceFormatter: fmtPrice },
    handleScale: { axisPressedMouseMove: { time: true, price: false } },
  });
  candles = chart.addSeries(CandlestickSeries, { upColor: UP, downColor: DN, borderUpColor: UP, borderDownColor: DN, wickUpColor: UP, wickDownColor: DN,
    priceFormat: { type: "custom", formatter: fmtPrice, minMove: 1e-12 }, priceLineColor: GOLD, priceLineStyle: 2 });
}

const toC = (b: Bar) => ({ time: b.time as UTCTimestamp, open: b.open, high: b.high, low: b.low, close: b.close });
/** Draws the bars with the quiet stretches filled and the last close carried up to now. A full draw sets everything; a poll
 *  only updates the forming bar and appends the new ones. */
function draw(full: boolean) {
  ensureChart();
  const view = fillGaps(bars, RES_SEC[res], Date.now() / 1000);
  if (!view.length) return;
  if (full || !drawn) {
    candles!.setData(view.map(toC));
    if (full) chart!.timeScale().scrollToRealTime();
  } else {
    for (const b of view) if (b.time >= drawn) candles!.update(toC(b));
  }
  drawn = view[view.length - 1].time;
  document.body.dataset.view = String(view.length);
}

/** pump.fun 1 s: a busy coin's 300 newest candles cover only minutes; up to 3 older pages fill the first half hour. */
async function moreHistory(my: number) {
  for (let i = 0; i < 3 && my === gen && res === "1s" && source === "pump.fun" && bars.length >= 250; i++) {
    const first = bars[0].time;
    if (Date.now() / 1000 - first > 25 * 60) return;
    const r = await ask({ type: "ca:candles", mint, pool: pool || null, highbar: hb, res, count: 300, source, pump: pf, before: first * 1000 }).catch(() => null);
    if (!r || my !== gen || r.source !== "pump.fun" || r.res !== "1s") return;
    const older = r.bars.filter((b) => b.time < first);
    if (!older.length) return;
    bars = mergeBars(older, bars);
    draw(true);
  }
}

function drawBar() {
  tf.replaceChildren(...RES_LIST.map((r) => {
    const b = document.createElement("button");
    b.type = "button"; b.textContent = r; b.className = r === res ? "on" : "";
    b.disabled = !supported.includes(r);
    b.title = b.disabled ? `${r} is not available from ${source ? SOURCE_LABEL[source] : "this source"}` : `${r} candles`;
    b.setAttribute("aria-pressed", String(r === res));
    b.addEventListener("click", () => { if (r !== res && !b.disabled) { res = r; auto = false; bars = []; drawn = 0; errors = 0; void tick(true); } });
    return b;
  }));
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
    document.body.dataset.note = note ?? ""; document.body.dataset.live = String(live);
    if (r.res !== res) { res = r.res; bars = []; }
    bars = full || changed ? mergeBars([], r.bars) : mergeBars(bars, r.bars);
    // the default 1 s view of a quiet coin (under 20 traded seconds in the last half hour) opens on 1 m instead
    if (full && auto && res === "1s" && supported.includes("1m") && source !== "live" && tradedIn(bars, Date.now() / 1000, 1800) < 20) {
      auto = false; res = "1m"; bars = []; drawn = 0; void tick(true); return;
    }
    msg.hidden = true;
    if (full || changed) drawn = 0;
    draw(full || changed);
    drawBar();
    if (full || changed) void moreHistory(my);
    document.body.dataset.source = source; document.body.dataset.res = res; document.body.dataset.chart = "native"; document.body.dataset.bars = String(bars.length);
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
