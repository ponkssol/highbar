"use client";
import { useEffect, useRef, useState } from "react";
import { fmtPricePlain } from "@/lib/format";
import { CHART_LOCALIZATION } from "@/lib/date";
import type { IChartApi, ISeriesApi, MouseEventParams, UTCTimestamp } from "lightweight-charts";
import { apiBase } from "@/lib/api";
import { DeltaPill } from "./StatsPanel";
import { Segmented } from "./TabBar";

export const TIMEFRAMES = ["1m", "5m", "15m", "1h", "4h", "1d"] as const;
type TF = (typeof TIMEFRAMES)[number];
interface Candle { t: number; o: number; h: number; l: number; c: number; v: number; vSol: number; n: number }
const BUCKETS = 300;
const STEP: Record<TF, number> = { "1m": 60e3, "5m": 300e3, "15m": 900e3, "1h": 3600e3, "4h": 14400e3, "1d": 86400e3 };

/** "#RRGGBB" or "rgb(a)(...)" plus an alpha -> "rgba(r,g,b,a)". Falls back to the arena gold. */
function withAlpha(c: string, a: number) {
  const hex = c.match(/^#([0-9a-f]{6})$/i);
  if (hex) { const n = parseInt(hex[1], 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; }
  const rgb = c.match(/^rgba?\(([^,]+),([^,]+),([^,)]+)/i);
  if (rgb) return `rgba(${rgb[1].trim()},${rgb[2].trim()},${rgb[3].trim()},${a})`;
  return `rgba(255,199,44,${a})`;
}

/** Theme colors and fonts from the --hb-* and next/font tokens. lightweight-charts draws on canvas, so it needs concrete colors and a real font
 *  family list (a CSS var() is not valid in a canvas font string and silently falls back to the default font). */
function theme() {
  const s = getComputedStyle(document.documentElement);
  const v = (n: string) => s.getPropertyValue(n).trim();
  const dark = document.documentElement.classList.contains("dark");
  const gold = v("--hb-gold") || "#FFC72C";
  const line = dark ? gold : v("--hb-gold-text") || gold;
  const mono = v("--font-mono");
  return {
    dark, ink: v("--hb-ink"), ink3: v("--hb-ink-3"), border: v("--hb-border"), line,
    top: withAlpha(gold, dark ? 0.22 : 0.28), bottom: withAlpha(gold, 0), grid: withAlpha(v("--hb-ink") || "#F3EEDF", dark ? 0.035 : 0.045),
    cross: withAlpha(v("--hb-ink-3") || "#958C79", 0.45), label: v("--hb-surface-muted"), vol: withAlpha(gold, dark ? 0.16 : 0.2),
    font: `${mono ? `${mono}, ` : ""}"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`,
  };
}
const fmtP = (p: number) => fmtPricePlain(p);
/** Axis step for the price scale: 4 significant digits of the largest close. One fixed decimal count per step, so tick labels never repeat. */
function axisFormat(maxPrice: number) {
  const mag = Number.isFinite(maxPrice) && maxPrice > 0 ? Math.floor(Math.log10(maxPrice)) : -8;
  const decimals = Math.max(0, Math.min(16, 3 - mag));
  const minMove = Number((10 ** -decimals).toFixed(decimals));
  return { minMove, formatter: (v: number) => (Math.abs(v) >= 1 ? v.toLocaleString("en-US", { maximumFractionDigits: decimals }) : v.toFixed(decimals)) };
}
/** Keep at least +-2% around the line, so a flat price does not stretch a few units of the last digit over the whole axis. */
const MIN_HALF_RANGE = 0.02;

export function PriceChart({ mint, className = "" }: { mint: string; className?: string }) {
  const [tf, setTf] = useState<TF>("15m");
  const [state, setState] = useState<"loading" | "ready" | "empty" | "error">("loading");
  const [readout, setReadout] = useState<{ price: number; change: number | null } | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const chart = useRef<IChartApi | null>(null);
  const series = useRef<{ a: ISeriesApi<"Area">; v: ISeriesApi<"Histogram"> } | null>(null);

  // create chart once (client only: dynamic import, never during SSR)
  useEffect(() => {
    let disposed = false, mo: MutationObserver | null = null;
    import("lightweight-charts").then(({ createChart, ColorType, CrosshairMode, LineStyle }) => {
      if (disposed || !box.current) return;
      const opts = (t: ReturnType<typeof theme>) => ({
        layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: t.ink3, fontFamily: t.font, fontSize: 11 },
        grid: { vertLines: { color: t.grid }, horzLines: { color: t.grid } },
        rightPriceScale: { borderVisible: false },
        timeScale: { borderVisible: false, timeVisible: true, secondsVisible: false, rightOffset: 4 },
        localization: CHART_LOCALIZATION, // month first crosshair dates, never the browser locale
        crosshair: {
          mode: CrosshairMode.Magnet,
          vertLine: { color: t.cross, width: 1 as const, style: LineStyle.Dashed, labelBackgroundColor: t.label },
          horzLine: { color: t.cross, width: 1 as const, style: LineStyle.Dashed, labelBackgroundColor: t.label },
        },
      });
      const th = theme();
      const ch = createChart(box.current, { autoSize: true, ...opts(th) });
      const areaOpts = (t: ReturnType<typeof theme>) => ({
        lineColor: t.line, topColor: t.top, bottomColor: t.bottom, priceLineColor: withAlpha(t.line, 0.55),
        crosshairMarkerBorderColor: t.line, crosshairMarkerBackgroundColor: t.dark ? "#15130F" : "#FFFDF8",
      });
      const a = ch.addAreaSeries({ ...areaOpts(th), lineWidth: 2, priceLineStyle: LineStyle.Dotted, crosshairMarkerRadius: 4, lastValueVisible: false, // no axis tag: it covered a tick label; the readout above shows the last close and the dotted line marks it
        priceFormat: { type: "custom", ...axisFormat(0) },
        autoscaleInfoProvider: (original: () => { priceRange: { minValue: number; maxValue: number } | null; margins?: { above: number; below: number } } | null) => {
          const r = original();
          if (!r?.priceRange) return r;
          const { minValue, maxValue } = r.priceRange, mid = (minValue + maxValue) / 2, half = Math.max((maxValue - minValue) / 2, Math.abs(mid) * MIN_HALF_RANGE);
          return { ...r, priceRange: { minValue: Math.max(0, mid - half), maxValue: mid + half } };
        } });
      const v = ch.addHistogramSeries({ priceScaleId: "vol", priceFormat: { type: "volume" }, color: th.vol, lastValueVisible: false, priceLineVisible: false });
      ch.priceScale("vol").applyOptions({ scaleMargins: { top: 0.86, bottom: 0 } });
      a.priceScale().applyOptions({ scaleMargins: { top: 0.1, bottom: 0.18 } });
      chart.current = ch; series.current = { a, v };
      ch.subscribeCrosshairMove((p: MouseEventParams) => {
        const d = p.seriesData.get(a) as { value?: number } | undefined;
        setHover(p.time && d && typeof d.value === "number" ? d.value : null);
      });
      const apply = () => { const t = theme(); ch.applyOptions(opts(t)); a.applyOptions(areaOpts(t)); v.applyOptions({ color: t.vol }); };
      mo = new MutationObserver(apply);
      mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
      setReady((n) => n + 1);
    }).catch(() => setState("error"));
    return () => { disposed = true; mo?.disconnect(); chart.current?.remove(); chart.current = null; series.current = null; };
  }, []);
  const [ready, setReady] = useState(0);

  // load + poll candles (10s). The line uses each bucket's close.
  useEffect(() => {
    if (!ready) return;
    let alive = true, first = true;
    setState("loading");
    const load = async () => {
      try {
        const to = Date.now(), from = to - (BUCKETS - 1) * STEP[tf];
        const r = await fetch(`${apiBase()}/tokens/${mint}/candles?tf=${tf}&from=${from}&to=${to}`, { cache: "no-store" });
        if (!r.ok) throw new Error(String(r.status));
        const j = (await r.json()) as { candles: Candle[] };
        if (!alive || !series.current) return;
        const cs = j.candles;
        series.current.a.setData(cs.map((x) => ({ time: (x.t / 1000) as UTCTimestamp, value: x.c })));
        series.current.v.setData(cs.map((x) => ({ time: (x.t / 1000) as UTCTimestamp, value: x.vSol })));
        series.current.a.applyOptions({ priceFormat: { type: "custom", ...axisFormat(Math.max(0, ...cs.map((x) => x.c))) } });
        // fit the data but keep a few empty bars on the right, so the last time label is not cut off at the price scale
        if (first && cs.length) chart.current?.timeScale().setVisibleLogicalRange({ from: 0, to: cs.length - 1 + Math.max(3, Math.round(cs.length * 0.04)) });
        first = false;
        const base = cs.find((x) => x.o > 0)?.o ?? 0;
        setReadout(cs.length ? { price: cs[cs.length - 1].c, change: base > 0 ? ((cs[cs.length - 1].c - base) / base) * 100 : null } : null);
        setState(cs.some((x) => x.n > 0) || cs.length ? "ready" : "empty");
      } catch { if (alive) setState((s) => (s === "ready" ? s : "error")); }
    };
    load();
    const id = setInterval(load, 10_000);
    return () => { alive = false; clearInterval(id); };
  }, [mint, tf, ready]);

  const shown = hover ?? readout?.price ?? null;
  return (
    // isolate: the chart's canvases carry their own z-index, keep them in this card's stacking context so overlays and modals stay above.
    <div data-testid="price-chart" className={`relative isolate flex flex-col rounded-lg border border-border bg-surface p-4 ${className}`}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div data-testid="chart-readout" className="num flex min-w-0 items-baseline gap-2.5">
          {shown != null ? (<>
            <span title={hover != null ? "Candle close" : "Last candle close"} className="text-lg font-semibold leading-none tracking-tight text-ink md:text-xl">{fmtP(shown)}</span>
            <span className="text-xs text-ink-3">SOL{hover == null && <span className="sr-only"> last candle close</span>}</span>
            {hover == null && readout?.change != null && (
              <span title={`Change over the visible ${tf} range`}><DeltaPill v={readout.change} /></span>
            )}
          </>) : <span className="text-[11px] text-ink-3">Price in SOL</span>}
        </div>
        <Segmented label="Timeframe" tone="ring" value={tf} onChange={setTf} options={TIMEFRAMES.map((t) => ({ id: t, label: t }))}
          className="flex gap-1 text-xs" indClassName="inset-y-0" itemClassName="num h-11 min-w-11 rounded-md px-2 md:h-7 md:min-w-0" />
      </div>
      <div className="relative min-h-0 flex-1">
        <div ref={box} className="absolute inset-0" />
        {state !== "ready" && (
          <div data-testid="chart-state" className="absolute inset-0 flex items-center justify-center bg-surface text-sm text-ink-3">
            {state === "loading" ? "Loading chart…" : state === "empty" ? "No trades yet" : "Chart unavailable. Retrying…"}
          </div>
        )}
      </div>
    </div>
  );
}