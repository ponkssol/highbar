/** Simple, dependency-free monochrome charts. */

export function BarChart({ data, height = 140 }: { data: { label: string; a: number; b: number }[]; height?: number }) {
  const max = Math.max(...data.map((d) => Math.max(d.a, d.b)), 1);
  return (
    <div className="flex items-end gap-3" style={{ height }}>
      {data.map((d) => (
        <div key={d.label} className="flex flex-1 flex-col items-center gap-2">
          <div className="flex w-full items-end justify-center gap-1" style={{ height: height - 22 }}>
            <div title={`${d.a} new`} className="w-1/2 max-w-[18px] rounded-[6px] bg-ink" style={{ height: `${(d.a / max) * 100}%` }} />
            <div title={`${d.b} graduated`} className="w-1/2 max-w-[18px] rounded-[6px] border border-ink bg-hatch" style={{ height: `${Math.max(4, (d.b / max) * 100)}%` }} />
          </div>
          <span className="text-xs text-ink-3">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

/** Half-circle gauge made of radial tick lines (BizLink style). */
export function TickGauge({ value, size = 200, ticks = 48, label, sub }: { value: number; size?: number; ticks?: number; label?: string; sub?: string }) {
  const r1 = size / 2 - 4;
  const r0 = r1 - 22;
  const cx = size / 2;
  const cy = size / 2;
  const on = Math.round(value * ticks);
  return (
    <div className="relative" style={{ width: size, height: size / 2 + 34 }}>
      <svg width={size} height={size / 2 + 4} viewBox={`0 0 ${size} ${size / 2 + 4}`}>
        {Array.from({ length: ticks + 1 }, (_, i) => {
          const a = Math.PI - (i / ticks) * Math.PI;
          const c = Math.cos(a), s = Math.sin(a);
          return (
            <line key={i} x1={cx + r0 * c} y1={cy - r0 * s} x2={cx + r1 * c} y2={cy - r1 * s}
              stroke={i <= on ? "var(--hb-ink)" : "var(--hb-border-strong)"} strokeWidth={2} strokeLinecap="round" />
          );
        })}
      </svg>
      <div className="absolute inset-x-0 text-center" style={{ top: size / 2 - 30 }}>
        <div className="num text-kpi">{Math.round(value * 100)}%</div>
        {label && <div className="text-[13px] text-ink-3">{label}</div>}
        {sub && <div className="num text-xs text-ink-3">{sub}</div>}
      </div>
    </div>
  );
}

/** Solid half-ring gauge (stroke 10) for token bonding progress. */
export function ArcGauge({ value, size = 180 }: { value: number; size?: number }) {
  const r = size / 2 - 8;
  const len = Math.PI * r;
  const d = `M 8 ${size / 2} A ${r} ${r} 0 0 1 ${size - 8} ${size / 2}`;
  return (
    <svg width={size} height={size / 2 + 8} viewBox={`0 0 ${size} ${size / 2 + 8}`}>
      <path d={d} fill="none" stroke="var(--hb-border)" strokeWidth={10} strokeLinecap="round" />
      <path d={d} fill="none" stroke="var(--hb-ink)" strokeWidth={10} strokeLinecap="round"
        strokeDasharray={`${len * Math.min(1, value)} ${len}`} />
    </svg>
  );
}

export function LineChart({ values, height = 240 }: { values: number[]; height?: number }) {
  const w = 800;
  const min = Math.min(...values), max = Math.max(...values);
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${height - 10 - ((v - min) / (max - min || 1)) * (height - 20)}`);
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="h-auto w-full" preserveAspectRatio="none" style={{ height }}>
      {[0.25, 0.5, 0.75].map((g) => (
        <line key={g} x1={0} x2={w} y1={height * g} y2={height * g} stroke="var(--hb-border)" strokeWidth={1} />
      ))}
      <polyline points={pts.join(" ")} fill="none" stroke="var(--hb-ink)" strokeWidth={2} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function StackedBar({ parts }: { parts: { value: number; style: "ink" | "hatch" | "border" }[] }) {
  const cls = { ink: "bg-ink", hatch: "bg-hatch border-y border-ink", border: "bg-border" } as const;
  const total = parts.reduce((a, p) => a + p.value, 0) || 1;
  return (
    <div className="flex h-3 w-full overflow-hidden rounded-full border border-ink">
      {parts.map((p, i) => <div key={i} className={cls[p.style]} style={{ width: `${(p.value / total) * 100}%` }} />)}
    </div>
  );
}