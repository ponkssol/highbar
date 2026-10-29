"use client";
import { useMemo } from "react";
import { useActivity, type ActivityEvent, type ActivityType } from "@/lib/activity";

const CELLS = 7 * 30;
const COLOR: Record<ActivityType, string> = {
  launch: "var(--hb-act-launch)",
  burn: "var(--hb-act-burn)",
  graduate: "var(--hb-act-graduate)",
  trade: "var(--hb-act-trade)",
};
const LABEL: Record<ActivityType, string> = { launch: "Launch", burn: "Burn", graduate: "Graduation", trade: "Trade" };

const fmtTime = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

export function ActivityGrid() {
  const { events, source, isFresh } = useActivity();
  const newestFirst = useMemo(() => [...events].reverse().slice(0, CELLS), [events]);
  const today = new Date().setHours(0, 0, 0, 0);
  const launches = events.filter((e) => e.type === "launch" && e.ts >= today).length;
  const burns = events.filter((e) => e.type === "burn" && e.ts >= today).length;
  const cells: (ActivityEvent | null)[] = [...newestFirst, ...Array(Math.max(0, CELLS - newestFirst.length)).fill(null)];

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="mb-4">
        <div className="flex items-center gap-2 text-[13px] text-ink-3">
          Protocol activity
          <span className="flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-ink-2">
            <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-buy opacity-60" /><span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-buy" /></span>
            Live{source === "mock" ? " · demo" : ""}
          </span>
        </div>
        <div className="mt-1 flex items-baseline gap-4">
          <span className="flex items-baseline gap-1.5"><span className="num text-2xl font-semibold text-buy">{launches}</span><span className="text-xs text-ink-3">launches today</span></span>
          <span className="flex items-baseline gap-1.5"><span className="num text-2xl font-semibold text-sell">{burns}</span><span className="text-xs text-ink-3">burns today</span></span>
        </div>
      </div>
      <div className="overflow-x-clip pt-8 -mt-8">
        <div className="grid grid-flow-col gap-[3px]" style={{ gridTemplateRows: "repeat(7, 11px)", gridAutoColumns: "11px" }}>
          {cells.map((e, i) =>
            e ? (
              <div key={e.id} data-tip={`${LABEL[e.type]} · $${e.symbol}${e.amount ? ` · ${e.amount.toLocaleString()}` : ""} · ${fmtTime(e.ts)}`}
                className={`hb-tip h-[11px] w-[11px] rounded-[2px] ${isFresh(e.id) && i < 3 ? "hb-cell-pop" : ""}`}
                style={{ background: COLOR[e.type], ["--glow" as string]: COLOR[e.type] }} />
            ) : (
              <div key={`empty-${i}`} className="h-[11px] w-[11px] rounded-[2px] " style={{ background: "var(--hb-act-empty)" }} />
            ),
          )}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-end gap-x-4 gap-y-1 text-xs text-ink-3">
        {(Object.keys(LABEL) as ActivityType[]).map((t) => (
          <span key={t} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[2px]" style={{ background: COLOR[t] }} />{LABEL[t]}</span>
        ))}
      </div>
    </div>
  );
}