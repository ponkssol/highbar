"use client";
import { useEffect, useMemo, useState } from "react";

export const TIMEFRAMES = ["1m", "5m", "15m", "1h", "1D"] as const;
type TF = (typeof TIMEFRAMES)[number];
interface Candle { t: number; o: number; h: number; l: number; c: number; v: number; buy: boolean }

function genCandles(mint: string, tf: TF, n = 60): Candle[] {
  let s = [...mint + tf].reduce((a, c) => a + c.charCodeAt(0), 0) || 1;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const step = { "1m": 60, "5m": 300, "15m": 900, "1h": 3600, "1D": 86400 }[tf] * 1000;
  const now = Math.floor(Date.now() / step) * step;
  let p = 0.00001;
  return Array.from({ length: n }, (_, i) => {
    const o = p;
    const c = Math.max(0.000002, o * (0.95 + r() * 0.11));
    const h = Math.max(o, c) * (1 + r() * 0.03), l = Math.min(o, c) * (1 - r() * 0.03);
    p = c;
    return { t: now - (n - i) * step, o, h, l, c, v: 0.2 + r() * 3, buy: c >= o };
  });
}

const W = 800, PAD = 8;

export function PriceChart({ mint, className = "" }: { mint: string; className?: string }) {
  const [mode, setMode] = useState<"line" | "candle">("line");
  const [tf, setTf] = useState<TF>("15m");
  const [hover, setHover] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const data = useMemo(() => genCandles(mint, tf), [mint, tf]);
  const H = 300, VH = 60, TOT = H + VH;
  const lo = Math.min(...data.map((d) => d.l)), hi = Math.max(...data.map((d) => d.h));
  const vmax = Math.max(...data.map((d) => d.v));
  const bw = (W - PAD * 2) / data.length;
  const x = (i: number) => PAD + i * bw + bw / 2;
  const y = (v: number) => PAD + (1 - (v - lo) / (hi - lo || 1)) * (H - PAD * 2);
  const line = data.map((d, i) => `${x(i)},${y(d.c)}`).join(" ");
  const area = `${x(0)},${H} ${line} ${x(data.length - 1)},${H}`;
  const hv = hover != null ? data[hover] : data[data.length - 1];
  const fmtP = (v: number) => v.toExponential(3);

  return (
    <div className={`flex flex-col rounded-lg border border-border bg-surface p-4 ${className}`}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex rounded-full border border-border bg-muted p-0.5 text-xs">
          {(["line", "candle"] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)} className={`rounded-full px-3 py-1 font-medium capitalize ${mode === m ? "bg-ink text-on-ink" : "text-ink-3 hover:text-ink"}`}>{m}</button>
          ))}
        </div>
        <div className="flex gap-1 text-xs">
          {TIMEFRAMES.map((t) => (
            <button key={t} onClick={() => setTf(t)} className={`num rounded-md px-2 py-1 ${tf === t ? "bg-muted font-semibold text-ink ring-1 ring-border" : "text-ink-3 hover:text-ink"}`}>{t}</button>
          ))}
        </div>
      </div>
      <div className="num mb-1 flex flex-wrap gap-3 text-[11px] text-ink-3">
        <span suppressHydrationWarning>{mounted ? new Date(hv.t).toLocaleString("en-GB", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }) : "\u00a0"}</span>
        <span>O <b className="font-medium text-ink">{fmtP(hv.o)}</b></span><span>H <b className="font-medium text-ink">{fmtP(hv.h)}</b></span>
        <span>L <b className="font-medium text-ink">{fmtP(hv.l)}</b></span><span>C <b className={`font-medium ${hv.buy ? "text-buy" : "text-sell"}`}>{fmtP(hv.c)}</b></span>
        <span>Vol <b className="font-medium text-ink">{hv.v.toFixed(2)} SOL</b></span>
      </div>
      <svg viewBox={`0 0 ${W} ${TOT}`} preserveAspectRatio="none" className="min-h-0 w-full flex-1"
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); const i = Math.floor((((e.clientX - r.left) / r.width) * W - PAD) / bw); setHover(Math.max(0, Math.min(data.length - 1, i))); }}>
        <defs>
          <pattern id="hb-vhatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="4" stroke="var(--hb-ink-3)" strokeWidth="1.5" />
          </pattern>
        </defs>
        {[0.25, 0.5, 0.75].map((g) => <line key={g} x1={0} x2={W} y1={H * g} y2={H * g} stroke="var(--hb-border)" strokeWidth={1} vectorEffect="non-scaling-stroke" />)}
        {mode === "line" ? (
          <>
            <polygon points={area} fill="var(--hb-ink)" fillOpacity={0.06} />
            <polyline points={line} fill="none" stroke="var(--hb-ink)" strokeWidth={1.5} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          </>
        ) : (
          data.map((d, i) => {
            const col = d.buy ? "var(--hb-buy)" : "var(--hb-sell)";
            return (
              <g key={i}>
                <line x1={x(i)} x2={x(i)} y1={y(d.h)} y2={y(d.l)} stroke={col} strokeWidth={1} vectorEffect="non-scaling-stroke" />
                <rect x={x(i) - bw * 0.35} width={bw * 0.7} y={Math.min(y(d.o), y(d.c))} height={Math.max(1, Math.abs(y(d.o) - y(d.c)))} fill={col} />
              </g>
            );
          })
        )}
        {data.map((d, i) => {
          const h = (d.v / vmax) * (VH - 6);
          return <rect key={`v${i}`} x={x(i) - bw * 0.35} width={bw * 0.7} y={TOT - h} height={h} fill={d.buy ? "var(--hb-border-strong)" : "url(#hb-vhatch)"} stroke={d.buy ? "none" : "var(--hb-ink-3)"} strokeWidth={0.5} vectorEffect="non-scaling-stroke" />;
        })}
        {hover != null && (
          <>
            <line x1={x(hover)} x2={x(hover)} y1={0} y2={TOT} stroke="var(--hb-ink-3)" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
            <line x1={0} x2={W} y1={y(data[hover].c)} y2={y(data[hover].c)} stroke="var(--hb-ink-3)" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
          </>
        )}
      </svg>
    </div>
  );
}