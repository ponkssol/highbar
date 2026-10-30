"use client";
/** Open Book charts: plain SVG and CSS in the gold theme, no chart library. Thin strokes, soft fills. */
import { useId, type ReactNode } from "react";
import { mix } from "./ObUi";

export interface Seg { key: string; v: number; color: string; label?: string }

/** Thin stacked bar with 2px gaps. Tiny parts keep a sliver so they stay visible. */
export function StackBar({ segs, height = 8, className = "" }: { segs: Seg[]; height?: number; className?: string }) {
  const tot = segs.reduce((a, s) => a + Math.max(0, s.v), 0);
  if (!tot) return <div className={`rounded-full bg-border ${className}`} style={{ height }} />;
  return (
    <div className={`flex gap-[2px] overflow-hidden rounded-full ${className}`} style={{ height }} role="img" aria-label={segs.map((s) => `${s.label ?? s.key} ${((s.v / tot) * 100).toFixed(1)}%`).join(", ")}>
      {segs.filter((s) => s.v > 0).map((s) => <i key={s.key} className="block h-full" style={{ width: `${Math.max((s.v / tot) * 100, 0.8)}%`, background: s.color }} />)}
    </div>
  );
}

/** Donut with hairline gaps between parts. `children` sits in the middle. */
export function Donut({ segs, size = 150, stroke = 15, children }: { segs: Seg[]; size?: number; stroke?: number; children?: ReactNode }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, tot = segs.reduce((a, s) => a + Math.max(0, s.v), 0);
  const parts = segs.filter((s) => s.v > 0);
  const gap = parts.length > 1 ? 2.5 : 0;
  let acc = 0;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={parts.map((s) => `${s.label ?? s.key} ${((s.v / tot) * 100).toFixed(1)}%`).join(", ")}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--hb-border)" strokeWidth={stroke} />
        {tot > 0 && parts.map((s) => {
          const len = (s.v / tot) * c, dash = Math.max(len - gap, 0.6), off = -acc;
          acc += len;
          return <circle key={s.key} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.color} strokeWidth={stroke} strokeDasharray={`${dash} ${c - dash}`} strokeDashoffset={off} transform={`rotate(-90 ${size / 2} ${size / 2})`} />;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}

/** Anti-sniper fee over time: a step line from the API schedule points (offsetMs, feeBps), with a short tail at the base fee. */
export function DecayChart({ points, durationMs, baseBps, className = "" }: { points: { offsetMs: number; feeBps: number }[]; durationMs: number; baseBps: number | null; className?: string }) {
  const W = 240, H = 58, top = 4, bot = 48, tail = 0.12;
  const max = Math.max(...points.map((p) => p.feeBps), baseBps ?? 0), min = Math.min(...points.map((p) => p.feeBps), baseBps ?? Infinity);
  const x = (ms: number) => (Math.min(ms, durationMs) / durationMs) * W * (1 - tail);
  const y = (b: number) => (max === min ? bot : top + ((max - b) / (max - min)) * (bot - top));
  const pts = [...points].sort((a, b) => a.offsetMs - b.offsetMs);
  let d = "";
  pts.forEach((p, i) => { d += i === 0 ? `M${x(p.offsetMs)} ${y(p.feeBps)}` : ` L${x(p.offsetMs)} ${y(pts[i - 1].feeBps)} L${x(p.offsetMs)} ${y(p.feeBps)}`; });
  const end = baseBps ?? pts[pts.length - 1]?.feeBps ?? 0;
  d += ` L${W} ${y(end)}`;
  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className={className} role="img" aria-label="Anti-sniper fee schedule over the first 60 seconds">
      <path d={`${d} L${W} ${H} L0 ${H}Z`} fill={mix("var(--hb-burn)", 12)} />
      <line x1="0" x2={W} y1={y(end)} y2={y(end)} stroke="var(--hb-border-strong)" strokeDasharray="2 3" vectorEffect="non-scaling-stroke" />
      <path d={d} fill="none" stroke="var(--hb-burn)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}

/** Tips per provider: one bar per provider, the sniper part hatched at the bottom. */
export function TipBars({ rows, unitLabel = "txs" }: { rows: { key: string; label: string; v: number; sniper: number; color: string; count: number | null }[]; unitLabel?: string }) {
  const id = useId().replace(/:/g, "");
  const W = 360, H = 200, labelH = 38, n = Math.max(rows.length, 1), slot = W / n, bw = Math.min(54, slot * 0.56);
  const max = Math.max(...rows.map((r) => r.v), 0) || 1;
  const sc = (v: number) => (v / max) * (H - 26);
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H + labelH}`} role="img" aria-label="Tips by provider" className="mx-auto block max-w-[420px]">
      <defs>
        <pattern id={`hat${id}`} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="5" height="5" fill="var(--hb-burn)" /><line x1="0" y1="0" x2="0" y2="5" stroke="var(--hb-surface)" strokeWidth="2" />
        </pattern>
      </defs>
      {[0.25, 0.5, 0.75, 1].map((g) => <line key={g} x1="0" x2={W} y1={H - sc(max * g)} y2={H - sc(max * g)} stroke="var(--hb-border)" />)}
      <line x1="0" x2={W} y1={H} y2={H} stroke="var(--hb-border-strong)" />
      {rows.map((r, i) => {
        const h = Math.max(sc(r.v), r.v > 0 ? 2 : 0), hs = Math.min(h, sc(r.sniper)), cx = slot * i + slot / 2, x0 = cx - bw / 2;
        return (
          <g key={r.key}>
            <rect x={x0} y={H - h} width={bw} height={h} rx="4" fill={mix(r.color, 75)} />
            {hs > 0 && <rect x={x0} y={H - hs} width={bw} height={hs} fill={`url(#hat${id})`} opacity=".85" />}
            <text x={cx} y={H - h - 7} textAnchor="middle" className="num" fontSize="12" fill="var(--hb-ink)">{r.v < 0.01 && r.v > 0 ? r.v.toFixed(4) : r.v.toFixed(2)}</text>
            <text x={cx} y={H + 17} textAnchor="middle" fontSize="11.5" fill="var(--hb-ink-2)">{r.label.length > 13 ? `${r.label.slice(0, 12)}…` : r.label}</text>
            {r.count != null && <text x={cx} y={H + 32} textAnchor="middle" className="num" fontSize="10.5" fill="var(--hb-ink-3)">{r.count.toLocaleString("en-US")} {unitLabel}</text>}
          </g>
        );
      })}
    </svg>
  );
}

/** Balance sparkline. */
export function Spark({ values, className = "", color = "var(--hb-gold)" }: { values: number[]; className?: string; color?: string }) {
  if (values.length < 2) return <div className={className} />;
  const W = 200, H = 40, mn = Math.min(...values), mx = Math.max(...values), span = mx - mn || 1;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * W},${H - 4 - ((v - mn) / span) * (H - 8)}`);
  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className={className} aria-hidden>
      <path d={`M${pts.join(" L")} L${W} ${H} L0 ${H}Z`} fill={mix(color, 10)} />
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}

export interface FlowNode { id: string; col: number; label: string; v: number; color: string; note?: string }
export interface FlowLink { from: string; to: string; v: number }
/** Sankey-style fee flow. Node heights follow value on one shared scale, bands are soft bezier ribbons tinted by the target. */
export function FeeFlow({ nodes, links, heads, fmt, height = 440 }: { nodes: FlowNode[]; links: FlowLink[]; heads: string[]; fmt: (n: FlowNode) => string; height?: number }) {
  const W = 1000, top = 34, H = height, nw = 9, gap = 22, cols = heads.length;
  const colX = (c: number) => Math.round((c * (W - 190)) / (cols - 1));
  const by = (c: number) => nodes.filter((n) => n.col === c);
  const minH = 2.5;
  let k = Infinity;
  for (let c = 0; c < cols; c++) { const ns = by(c), sum = ns.reduce((a, n) => a + n.v, 0); if (sum > 0) k = Math.min(k, (H - top - gap * (ns.length - 1) - minH * ns.length) / sum); }
  if (!Number.isFinite(k) || k < 0) k = 0;
  const pos = new Map<string, { x: number; y: number; h: number }>();
  for (let c = 0; c < cols; c++) {
    const ns = by(c);
    const tot = ns.reduce((a, n) => a + n.v * k + minH, 0) + gap * (ns.length - 1);
    // the last column hangs off its single parent (platform), the others are centered
    const parent = c === cols - 1 ? links.find((l) => ns.some((n) => n.id === l.to))?.from : undefined;
    const pp = parent ? pos.get(parent) : undefined;
    let y = pp ? Math.min(Math.max(top, pp.y + pp.h / 2 - tot / 2), H - tot) : top + (H - top - tot) / 2;
    for (const n of ns) { const h = n.v * k + minH; pos.set(n.id, { x: colX(c), y, h }); y += h + gap; }
  }
  const outOff = new Map<string, number>(), inOff = new Map<string, number>();
  const color = new Map(nodes.map((n) => [n.id, n.color]));
  const bands = links.filter((l) => pos.has(l.from) && pos.has(l.to) && l.v > 0).map((l, i) => {
    const a = pos.get(l.from)!, b = pos.get(l.to)!;
    const srcTot = links.filter((x) => x.from === l.from).reduce((s, x) => s + x.v, 0) || 1;
    const dstTot = links.filter((x) => x.to === l.to).reduce((s, x) => s + x.v, 0) || 1;
    const ha = (l.v / srcTot) * a.h, hb = (l.v / dstTot) * b.h;
    const ya = a.y + (outOff.get(l.from) ?? 0), yb = b.y + (inOff.get(l.to) ?? 0);
    outOff.set(l.from, (outOff.get(l.from) ?? 0) + ha); inOff.set(l.to, (inOff.get(l.to) ?? 0) + hb);
    const x0 = a.x + nw, x1 = b.x, mx = (x0 + x1) / 2;
    return <path key={i} d={`M${x0} ${ya} C${mx} ${ya} ${mx} ${yb} ${x1} ${yb} L${x1} ${yb + hb} C${mx} ${yb + hb} ${mx} ${ya + ha} ${x0} ${ya + ha}Z`} fill={mix(color.get(l.to) ?? "var(--hb-gold)", 22)} />;
  });
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H + 8}`} role="img" aria-label="Fee flow from traders to fee types, recipients and platform use" className="min-w-[680px]">
      {heads.map((h, c) => <text key={h} x={colX(c)} y={12} fontSize="10.5" letterSpacing="1.6" fill="var(--hb-ink-3)" className="num">{h.toUpperCase()}</text>)}
      {bands}
      {nodes.map((n) => {
        const p = pos.get(n.id); if (!p) return null;
        const cy = p.y + p.h / 2;
        return (
          <g key={n.id}>
            <rect x={p.x} y={p.y} width={nw} height={p.h} rx="2" fill={n.color} />
            <text x={p.x + nw + 8} y={cy - 2} fontSize="12" fill="var(--hb-ink)">{n.label}{n.note && <tspan dx="5" className="num" fontSize="11" fill="var(--hb-ink-3)">{n.note}</tspan>}</text>
            <text x={p.x + nw + 8} y={cy + 11} className="num" fontSize="10.5" fill="var(--hb-ink-3)">{fmt(n)}</text>
          </g>
        );
      })}
    </svg>
  );
}
