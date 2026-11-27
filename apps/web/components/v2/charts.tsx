"use client";
import { useEffect, useRef } from "react";
import { apiBase } from "@/lib/api";
import { fmtPricePlain } from "@/lib/format";

const NS = "http://www.w3.org/2000/svg";

export function BondingCurve({ tiers }: { tiers: { sol: number; name: string }[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    const svg = host.querySelector("svg");
    if (!svg) return;
    let run = 0;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const draw = () => {
      const W = host.clientWidth, H = host.clientHeight;
      if (!W || !H) return;
      const id = ++run;
      const max = tiers[tiers.length - 1]?.sol || 250;
      const L = 14, R = 14, T = 36, B = 40, x0 = L, x1 = W - R, y0 = H - B, y1 = T, pw = x1 - x0, ph = y0 - y1;
      const X = (q: number) => x0 + (pw * q) / max;
      const f = (q: number) => y0 - ph * (0.03 + 0.97 * Math.pow(q / max, 2.1));
      let d = "";
      for (let k = 0; k <= 120; k++) {
        const q = (max * k) / 120;
        d += `${k ? "L" : "M"}${X(q).toFixed(1)} ${f(q).toFixed(1)}`;
      }
      const marks = tiers.map((t, i) => {
        const x = X(t.sol), y = f(t.sol);
        const c = i === tiers.length - 1 ? "var(--y)" : i === 0 ? "var(--tx2)" : "var(--yx)";
        return `<line x1="${x}" y1="${y}" x2="${x}" y2="${y0}" stroke="${c}" stroke-dasharray="3 4" opacity=".6"/><rect x="${x - 5}" y="${y - 5}" width="10" height="10" fill="var(--bg)" stroke="${c}" stroke-width="1.5"/><text x="${x}" y="${y0 + 18}" text-anchor="${i === tiers.length - 1 ? "end" : "middle"}" fill="var(--tx3)" font-size="11" font-family="Geist Mono,monospace">${t.sol}${i === tiers.length - 1 ? " SOL" : ""}</text>`;
      }).join("");
      svg.innerHTML = `<path d="${d}" fill="none" stroke="var(--bd-x)" stroke-width="1" stroke-dasharray="2 5" opacity=".55"/>
        <path d="${d}" fill="none" stroke="#ffc72c" stroke-width="2.2"/>
        ${marks}
        <line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y0}" stroke="var(--tx2)"/>
        <text x="${x0}" y="${y0 + 18}" fill="var(--tx3)" font-size="11" font-family="Geist Mono,monospace">0</text>
        <text x="${x0 + 8}" y="${y1 - 8}" fill="var(--tx3)" font-size="11" font-family="Geist Mono,monospace">PRICE ↑</text>
        <text x="${x0}" y="${y1 + 14}" fill="var(--tx3)" font-size="11" font-family="Geist Mono,monospace">launch</text>
        <text x="${x1}" y="${y1 + 14}" text-anchor="end" fill="var(--yx)" font-size="11" font-family="Geist Mono,monospace">DAMM v2 →</text>
        <g id="hb-dot"><circle r="5" fill="#fff6d6"/><circle r="2.6" fill="#ffc72c"/></g>`;
      const dot = svg.querySelector("#hb-dot");
      if (!dot) return;
      const place = (p: number) => {
        const q = p * max;
        dot.setAttribute("transform", `translate(${X(q)},${f(q)})`);
      };
      if (reduce) { place(0.62); return; }
      const t0 = performance.now();
      const step = (n: number) => {
        if (id !== run || !dot.isConnected) return;
        place(((n - t0) % 7000) / 7000);
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    const ro = new ResizeObserver(() => requestAnimationFrame(draw));
    ro.observe(host);
    draw();
    return () => { run++; ro.disconnect(); };
  }, [tiers]);
  return (
    <div className="fig" ref={ref}>
      <svg aria-label="Bonding curve with three graduation tiers" />
    </div>
  );
}

export function MigrationGauge({ graduated, total }: { graduated: number; total: number }) {
  const pct = total > 0 ? Math.max(0, Math.min(1, graduated / total)) : 0;
  const angle = -90 + pct * 180;
  let ticks = "";
  for (let i = 0; i <= 20; i++) {
    const a = Math.PI * (1 - i / 20), r1 = 88, r2 = i % 5 ? 93 : 97;
    ticks += `<line x1="${(100 + r1 * Math.cos(a)).toFixed(1)}" y1="${(105 - r1 * Math.sin(a)).toFixed(1)}" x2="${(100 + r2 * Math.cos(a)).toFixed(1)}" y2="${(105 - r2 * Math.sin(a)).toFixed(1)}" stroke="var(--bd)"/>`;
  }
  return (
    <>
      <svg viewBox="0 0 200 120" aria-label={`${Math.round(pct * 100)}% migrated`} dangerouslySetInnerHTML={{ __html: `${ticks}<path d="M20 105 A80 80 0 0 1 180 105" fill="none" stroke="var(--d3)" stroke-width="10"/><g transform="rotate(${angle} 100 105)"><line x1="100" y1="105" x2="100" y2="38" stroke="#ffc72c" stroke-width="1.5"/><circle cx="100" cy="105" r="4" fill="#ffc72c"/></g>` }} />
      <div className="gv"><b>{Math.round(pct * 100)}%</b><span>{graduated} of {total} tokens migrated</span></div>
    </>
  );
}

type Candle = { t: number; c: number };

export function CandleChart({ mint, tf }: { mint: string; tf: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const data = useRef<Candle[]>([]);
  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    let alive = true;
    const svg = host.querySelector("svg");
    const draw = () => {
      if (!svg) return;
      const series = data.current;
      const W = host.clientWidth, H = host.clientHeight;
      if (!W || !H || series.length < 2) {
        if (svg) svg.innerHTML = `<text x="16" y="32" fill="var(--tx3)" font-size="12" font-family="Geist Mono,monospace">No trades in this window yet</text>`;
        return;
      }
      const pr = W < 520 ? 14 : 72, pl = 14, pt = 18, pb = 28;
      const vals = series.map((c) => c.c);
      const mn = Math.min(...vals), mx = Math.max(...vals);
      const span = mx - mn || mn * 0.01 || 1;
      const X = (i: number) => pl + ((W - pl - pr) * i) / (series.length - 1);
      const Y = (v: number) => pt + (H - pt - pb) * (1 - (v - mn) / span);
      const d = series.map((c, i) => `${i ? "L" : "M"}${X(i).toFixed(1)} ${Y(c.c).toFixed(1)}`).join("");
      const lx = X(series.length - 1), ly = Y(series[series.length - 1].c);
      let g = "";
      for (let k = 0; k <= 4; k++) {
        const v = mn + span * (k / 4), y = Y(v);
        g += `<line x1="${pl}" x2="${W - pr}" y1="${y}" y2="${y}" stroke="var(--d3)"/>${W < 520 ? "" : `<text x="${W - pr + 6}" y="${y + 4}" fill="var(--tx3)" font-family="Geist Mono,monospace" font-size="11">${fmtPricePlain(v)}</text>`}`;
      }
      const first = new Date(series[0].t), last = new Date(series[series.length - 1].t);
      const fmt = (d0: Date) => d0.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      g += `<text x="${pl}" y="${H - 8}" fill="var(--tx3)" font-family="Geist Mono,monospace" font-size="11">${fmt(first)}</text>`;
      g += `<text x="${W - pr}" y="${H - 8}" text-anchor="end" fill="var(--tx3)" font-family="Geist Mono,monospace" font-size="11">${fmt(last)}</text>`;
      svg.innerHTML = `<defs><linearGradient id="gf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffc72c" stop-opacity=".22"/><stop offset="1" stop-color="#ffc72c" stop-opacity="0"/></linearGradient></defs>${g}<path d="${d}L${lx} ${H - pb}L${pl} ${H - pb}Z" fill="url(#gf)"/><path d="${d}" fill="none" stroke="#ffc72c" stroke-width="1.5"/><line x1="${pl}" x2="${W - pr}" y1="${ly}" y2="${ly}" stroke="#ffc72c" stroke-dasharray="2 4" opacity=".6"/><rect x="${lx - 3}" y="${ly - 3}" width="6" height="6" fill="#ffc72c"/>`;
    };
    const load = async () => {
      const step: Record<string, number> = { "1m": 60e3, "5m": 300e3, "15m": 900e3, "1h": 3600e3, "4h": 14400e3, "1d": 86400e3 };
      const to = Date.now(), from = to - (step[tf] ?? 900e3) * 300;
      const r = await fetch(`${apiBase()}/tokens/${mint}/candles?tf=${tf}&from=${from}&to=${to}`, { cache: "no-store" });
      if (!r.ok) return;
      const j = await r.json() as { candles?: Candle[] };
      if (!alive) return;
      data.current = (j.candles ?? []).filter((c) => c && c.c > 0);
      draw();
    };
    void load();
    const id = setInterval(() => void load(), 10_000);
    const ro = new ResizeObserver(() => requestAnimationFrame(draw));
    ro.observe(host);
    return () => { alive = false; clearInterval(id); ro.disconnect(); };
  }, [mint, tf]);
  return <div className="chart brk" ref={ref}><span className="c1" /><span className="c2" /><svg aria-label="Price chart" /></div>;
}

void NS;
