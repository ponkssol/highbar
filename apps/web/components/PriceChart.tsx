"use client";
import { useEffect, useRef, useState } from "react";
import type { IChartApi, ISeriesApi, UTCTimestamp } from "lightweight-charts";
import { apiBase } from "@/lib/api";

export const TIMEFRAMES = ["1m", "5m", "15m", "1h", "4h", "1d"] as const;
type TF = (typeof TIMEFRAMES)[number];
interface Candle { t: number; o: number; h: number; l: number; c: number; v: number; vSol: number; n: number }
const BUCKETS = 300;
const STEP: Record<TF, number> = { "1m": 60e3, "5m": 300e3, "15m": 900e3, "1h": 3600e3, "4h": 14400e3, "1d": 86400e3 };

/** Theme colors from --hb-* tokens (lightweight-charts needs concrete colors). */
function theme() {
  const s = getComputedStyle(document.documentElement);
  const v = (n: string) => s.getPropertyValue(n).trim();
  return { bg: v("--hb-surface"), ink: v("--hb-ink"), ink3: v("--hb-ink-3"), border: v("--hb-border"), buy: v("--hb-buy"), sell: v("--hb-sell") };
}
const fmtP = (p: number) => (p === 0 ? "0" : p < 0.001 ? p.toExponential(3) : p.toPrecision(4));

export function PriceChart({ mint, className = "" }: { mint: string; className?: string }) {
  const [tf, setTf] = useState<TF>("15m");
  const [state, setState] = useState<"loading" | "ready" | "empty" | "error">("loading");
  const [last, setLast] = useState<Candle | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const chart = useRef<IChartApi | null>(null);
  const series = useRef<{ c: ISeriesApi<"Candlestick">; v: ISeriesApi<"Histogram"> } | null>(null);

  // create chart once (client only: dynamic import, never during SSR)
  useEffect(() => {
    let disposed = false, mo: MutationObserver | null = null;
    import("lightweight-charts").then(({ createChart, CrosshairMode }) => {
      if (disposed || !box.current) return;
      const th = theme();
      const ch = createChart(box.current, {
        autoSize: true,
        layout: { background: { color: th.bg }, textColor: th.ink3, fontFamily: "var(--font-mono), monospace", fontSize: 11 },
        grid: { vertLines: { color: th.border }, horzLines: { color: th.border } },
        rightPriceScale: { borderColor: th.border }, timeScale: { borderColor: th.border, timeVisible: true, secondsVisible: false },
        crosshair: { mode: CrosshairMode.Normal },
      });
      const c = ch.addCandlestickSeries({ upColor: th.buy, downColor: th.sell, borderVisible: false, wickUpColor: th.buy, wickDownColor: th.sell,
        priceFormat: { type: "custom", minMove: 1e-12, formatter: fmtP } });
      const v = ch.addHistogramSeries({ priceScaleId: "vol", priceFormat: { type: "volume" }, color: th.ink3 });
      ch.priceScale("vol").applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
      c.priceScale().applyOptions({ scaleMargins: { top: 0.08, bottom: 0.25 } });
      chart.current = ch; series.current = { c, v };
      const apply = () => {
        const t = theme();
        ch.applyOptions({ layout: { background: { color: t.bg }, textColor: t.ink3 }, grid: { vertLines: { color: t.border }, horzLines: { color: t.border } },
          rightPriceScale: { borderColor: t.border }, timeScale: { borderColor: t.border } });
        c.applyOptions({ upColor: t.buy, downColor: t.sell, wickUpColor: t.buy, wickDownColor: t.sell });
      };
      mo = new MutationObserver(apply);
      mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
      setReady((n) => n + 1);
    }).catch(() => setState("error"));
    return () => { disposed = true; mo?.disconnect(); chart.current?.remove(); chart.current = null; series.current = null; };
  }, []);
  const [ready, setReady] = useState(0);

  // load + poll candles (10s)
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
        const th = theme();
        const cs = j.candles;
        series.current.c.setData(cs.map((x) => ({ time: (x.t / 1000) as UTCTimestamp, open: x.o, high: x.h, low: x.l, close: x.c })));
        series.current.v.setData(cs.map((x, i) => ({ time: (x.t / 1000) as UTCTimestamp, value: x.vSol, color: x.c >= (i ? cs[i - 1].c : x.o) ? th.buy : th.sell })));
        if (first && cs.length) chart.current?.timeScale().fitContent();
        first = false;
        setLast(cs.length ? cs[cs.length - 1] : null);
        setState(cs.some((x) => x.n > 0) || cs.length ? "ready" : "empty");
      } catch { if (alive) setState((s) => (s === "ready" ? s : "error")); }
    };
    load();
    const id = setInterval(load, 10_000);
    return () => { alive = false; clearInterval(id); };
  }, [mint, tf, ready]);

  return (
    <div data-testid="price-chart" className={`flex flex-col rounded-lg border border-border bg-surface p-4 ${className}`}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="num flex flex-wrap gap-3 text-[11px] text-ink-3">
          {last ? (<>
            <span>O <b className="font-medium text-ink">{fmtP(last.o)}</b></span><span>H <b className="font-medium text-ink">{fmtP(last.h)}</b></span>
            <span>L <b className="font-medium text-ink">{fmtP(last.l)}</b></span><span>C <b className={`font-medium ${last.c >= last.o ? "text-buy" : "text-sell"}`}>{fmtP(last.c)}</b></span>
            <span>Vol <b className="font-medium text-ink">{last.vSol.toFixed(3)} SOL</b></span>
          </>) : <span>Price in SOL</span>}
        </div>
        <div className="flex gap-1 text-xs" role="tablist" aria-label="Timeframe">
          {TIMEFRAMES.map((t) => (
            <button key={t} role="tab" aria-selected={tf === t} onClick={() => setTf(t)}
              className={`num h-11 min-w-11 rounded-md px-2 md:h-7 md:min-w-0 ${tf === t ? "bg-muted font-semibold text-ink ring-1 ring-border" : "text-ink-3 hover:text-ink"}`}>{t}</button>
          ))}
        </div>
      </div>
      <div className="relative min-h-0 flex-1">
        <div ref={box} className="absolute inset-0" />
        {state !== "ready" && (
          <div data-testid="chart-state" className="absolute inset-0 flex items-center justify-center bg-surface text-sm text-ink-3">
            {state === "loading" ? "Loading chart..." : state === "empty" ? "No trades yet" : "Chart unavailable. Retrying..."}
          </div>
        )}
      </div>
    </div>
  );
}