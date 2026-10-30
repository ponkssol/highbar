"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { BurnBadge } from "./ui";

function seeded(n: number, base: number, spread: number, seed: number) {
  let s = seed;
  return Array.from({ length: n }, () => { s = (s * 9301 + 49297) % 233280; return Math.round(base + (s / 233280 - 0.3) * spread); });
}

export function DeltaPill({ v }: { v: number }) {
  const up = v >= 0;
  return (
    <span className={`num inline-flex h-[18px] shrink-0 items-center gap-0.5 whitespace-nowrap rounded-full px-1.5 text-[10px] font-medium leading-none md:text-[11px] bg-[color-mix(in_srgb,var(--hb-ink)_6%,transparent)] ${up ? "text-buy" : "text-sell"}`}>
      {up ? "▲" : "▼"} {Math.abs(v).toFixed(1)}%
    </span>
  );
}

export function Sparkline({ values, w = 80, h = 24 }: { values: number[]; w?: number; h?: number }) {
  const min = Math.min(...values), max = Math.max(...values);
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - 2 - ((v - min) / (max - min || 1)) * (h - 4)}`).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0">
      <polyline points={pts} fill="none" stroke="var(--hb-ink-2)" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function LaunchChart() {
  const [range, setRange] = useState<"7D" | "30D">("7D");
  const data = useMemo(() => {
    const n = range === "7D" ? 7 : 30;
    const launched = seeded(n, 22, 26, range === "7D" ? 7 : 30);
    const grad = launched.map((v, i) => Math.max(1, Math.round(v * (0.12 + ((i * 7) % 10) / 100))));
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    return launched.map((a, i) => ({ a, b: grad[i], label: n === 7 ? days[(i + 4) % 7] : i % 5 === 4 || i === n - 1 ? String(i + 1) : "" }));
  }, [range]);
  const total = data.reduce((s, d) => s + d.a, 0);
  const max = Math.ceil(Math.max(...data.map((d) => d.a)) / 10) * 10 || 10;
  const H = 130;
  return (
    <div className="rounded-lg border border-border bg-surface p-3 md:p-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[13px] text-ink-3">Tokens launched · {range === "7D" ? "this week" : "30 days"}</div>
          <div className="mt-1 flex items-center gap-2"><span className="num text-2xl font-semibold">{total}</span><DeltaPill v={range === "7D" ? 12.4 : 8.1} /></div>
        </div>
        <div className="flex rounded-full border border-border bg-muted p-0.5 text-xs">
          {(["7D", "30D"] as const).map((r) => (
            <button key={r} onClick={() => setRange(r)} className={`rounded-full px-3 py-1 font-medium ${range === r ? "bg-ink text-on-ink" : "text-ink-3 hover:text-ink"}`}>{r}</button>
          ))}
        </div>
      </div>
      <div className="relative" style={{ height: H + 20 }}>
        {[0, 0.5, 1].map((g) => (
          <div key={g} className="absolute inset-x-0 flex items-center gap-2" style={{ top: H - g * H }}>
            <span className="num w-6 -translate-y-1/2 text-right text-[10px] text-ink-3">{Math.round(g * max)}</span>
            <div className="h-px flex-1 -translate-y-1/2 border-t border-dashed border-border" />
          </div>
        ))}
        <div className="absolute bottom-5 left-8 right-0 flex items-end gap-1.5" style={{ height: H }}>
          {data.map((d, i) => {
            const today = i === data.length - 1;
            return (
              <div key={i} className="group relative flex h-full flex-1 flex-col items-center justify-end" title={`${d.a} launched · ${d.b} graduated`}>
                <div className={`flex w-full max-w-[14px] flex-col overflow-hidden rounded-full ${today ? "" : "opacity-60 group-hover:opacity-100"}`} style={{ height: `${(d.a / max) * 100}%` }}>
                  <div className="flex-1 bg-ink" />
                  <div className="border-t border-ink bg-hatch" style={{ height: `${(d.b / d.a) * 100}%` }} />
                </div>
                <span className={`absolute -bottom-5 text-[10px] ${today ? "font-semibold text-ink" : "text-ink-3"}`}>{today && range === "7D" ? "Today" : d.label}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-3 flex items-center gap-4 text-xs text-ink-3">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-ink" />Launched</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full border border-ink bg-hatch" />Graduated</span>
      </div>
    </div>
  );
}

export function KpiCell({ label, value, unit, delta, spark, href, badge, className = "" }: { label: string; value: string; unit?: string; delta: number; spark: number[]; href: string; badge?: React.ReactNode; className?: string }) {
  return (
    <Link href={href} className={`flex min-w-0 flex-col justify-between gap-2 p-3 transition-colors md:gap-3 md:p-5 hover:bg-muted ${className}`}>
      <div className="flex min-w-0 items-center justify-between gap-1.5 text-[12px] text-ink-3 md:text-[13px]"><span className="flex min-w-0 items-center gap-1.5"><span className="truncate">{label}</span>{badge && <span className="hidden md:inline-flex">{badge}</span>}</span><DeltaPill v={delta} /></div>
      <div className="flex min-w-0 items-end justify-between gap-2">
        <div className="flex items-baseline gap-1"><span className="num text-2xl font-semibold tracking-tight">{value}</span>{unit && <span className="text-xs text-ink-3">{unit}</span>}</div>
        <span className="hidden min-[400px]:block md:block"><Sparkline values={spark} /></span><span className="min-[400px]:hidden md:hidden"><Sparkline values={spark} w={48} h={20} /></span>
      </div>
    </Link>
  );
}

export function KpiGrid({ stats, className = "", bare = false }: { stats: { totalVolumeSol: number; volumeDelta: number; creatorFeesSol: number; creatorDelta: number; barBurned: number; burnDelta: number; activeTraders24h?: number }; className?: string; bare?: boolean }) {
  return (
    <div className={`grid min-w-0 grid-cols-2 overflow-hidden ${bare ? "" : "rounded-lg border border-border bg-surface"} [&>*]:border-border [&>*:nth-child(-n+2)]:border-b [&>*:nth-child(odd)]:border-r ${className}`}>
      <KpiCell label="Total volume" value={stats.totalVolumeSol.toLocaleString("en-US", { maximumFractionDigits: 0 })} unit="SOL" delta={stats.volumeDelta} spark={seeded(14, 50, 40, 3)} href="/" />
      <KpiCell label="Fees to creators" value={stats.creatorFeesSol.toFixed(1)} unit="SOL" delta={stats.creatorDelta} spark={seeded(14, 50, 40, 5)} href="/leaderboard" />
      <KpiCell label="$HIGHER burned" value={`${(stats.barBurned / 1e6).toFixed(2)}M`} delta={stats.burnDelta} spark={seeded(14, 50, 40, 11)} href="/burn" badge={<BurnBadge />} />
      <KpiCell label="Active traders 24h" value={(stats.activeTraders24h ?? 0).toLocaleString("en-US")} delta={0} spark={seeded(14, 50, 40, 17)} href="/leaderboard" />
    </div>
  );
}