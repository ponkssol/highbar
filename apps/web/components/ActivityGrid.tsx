"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useActivity, type ActivityEvent, type ActivityType } from "@/lib/activity";

const GAP = 3;
const COLOR: Record<ActivityType, string> = {
  launch: "var(--hb-act-launch)",
  burn: "var(--hb-act-burn)",
  graduate: "var(--hb-act-graduate)",
  trade: "var(--hb-act-trade)",
};
const LABEL: Record<ActivityType, string> = { launch: "Launch", burn: "Burn", graduate: "Graduated", trade: "Trade" };
const PLURAL: Record<ActivityType, string> = { launch: "Launches", burn: "Burns", graduate: "Graduated", trade: "Trades" };
const ORDER: ActivityType[] = ["launch", "burn", "graduate", "trade"];
const fmtTime = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

export function ActivityGrid({ className = "", bare = false }: { className?: string; bare?: boolean }) {
  const { events, source, isFresh } = useActivity();
  const ref = useRef<HTMLDivElement>(null);
  const [small, setSmall] = useState(false);
  useEffect(() => { const m = matchMedia("(max-width: 767px)"); const f = () => setSmall(m.matches); f(); m.addEventListener("change", f); return () => m.removeEventListener("change", f); }, []);
  const ROWS = small ? 5 : 7, CELL = small ? 9 : 11;
  const [cols, setCols] = useState(30);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setCols(Math.max(8, Math.floor((e.contentRect.width + GAP) / (CELL + GAP)))));
    ro.observe(el);
    return () => ro.disconnect();
  }, [CELL]);
  const total = cols * ROWS;
  // oldest left -> newest right, column by column; empty padding cells at the end (future)
  const shown = useMemo(() => events.slice(-total), [events, total]);
  const cells: (ActivityEvent | null)[] = [...shown, ...Array(Math.max(0, total - shown.length)).fill(null)];
  const today = new Date().setHours(0, 0, 0, 0);
  const count = (t: ActivityType) => events.filter((e) => e.type === t && e.ts >= today).length;
  const lastIdx = shown.length - 1;

  return (
    <div className={`flex min-w-0 flex-col p-3 md:p-5 ${bare ? "" : "rounded-lg border border-border bg-surface"} ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Protocol activity</h3>
          <span className="flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-ink-2">
            <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-buy opacity-60" /><span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-buy" /></span>
            Live{source === "mock" ? " · demo" : ""}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {ORDER.map((t) => (
            <span key={t} className="flex items-center gap-1.5 rounded-full border border-border bg-muted px-1.5 py-0.5 text-[10px] text-ink-3">
              <span className="h-2 w-2 rounded-[2px]" style={{ background: COLOR[t] }} />{PLURAL[t]} <span className="num font-semibold text-ink">{count(t)}</span>
            </span>
          ))}
        </div>
      </div>
      <div ref={ref} className="mt-3 flex flex-1 items-center md:mt-5">
        <div className="grid w-full grid-flow-col justify-between" style={{ gridTemplateRows: `repeat(${ROWS}, ${CELL}px)`, gridAutoColumns: `${CELL}px`, rowGap: GAP }}>
          {cells.map((e, i) =>
            e ? (
              <div key={e.id} data-tip={`${LABEL[e.type]} · $${e.symbol}${e.amount ? ` · ${e.amount.toLocaleString()}` : ""} · ${fmtTime(e.ts)}`}
                className={`hb-tip rounded-[2px] ${isFresh(e.id) && i >= lastIdx - 2 ? "hb-cell-pop" : ""}`}
                style={{ width: CELL, height: CELL, background: COLOR[e.type], ["--glow" as string]: COLOR[e.type] }} />
            ) : (
              <div key={`empty-${i}`} className="rounded-[2px]" style={{ width: CELL, height: CELL, background: "var(--hb-act-empty)" }} />
            ),
          )}
        </div>
      </div>
      <div className="mt-4 hidden items-center justify-end gap-3 text-[11px] md:flex text-ink-3">
        <span>Older</span>
        {ORDER.map((t) => (
          <span key={t} className="flex items-center gap-1.5"><span className="h-[11px] w-[11px] rounded-[2px]" style={{ background: COLOR[t] }} />{LABEL[t]}</span>
        ))}
        <span>Newer →</span>
      </div>
    </div>
  );
}