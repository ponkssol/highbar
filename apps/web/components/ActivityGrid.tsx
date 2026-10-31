"use client";
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { BUCKET_MS, useActivity, type ActivityEvent, type ActivityType } from "@/lib/activity";
import { fmtTimeUS } from "@/lib/date";
import s from "./ActivityGrid.module.css";

/** "Arena wall": every square is a 10 s seat, every column one minute (six seats, read top to bottom), oldest on the left.
 *  The seat in progress carries a soft gold torch ring. When a minute closes, the wall slides one column to the left. */
const ROWS = 6;
const GAP = 3;
const MAX_COLS = 60;
const COLOR: Record<ActivityType, string> = {
  launch: "var(--hb-act-launch)",
  burn: "var(--hb-act-burn)",
  graduate: "var(--hb-act-graduate)",
  trade: "var(--hb-act-trade)",
};
const LABEL: Record<ActivityType, string> = { launch: "Launch", burn: "Burn", graduate: "Migrated", trade: "Trade" };
const ONE: Record<ActivityType, string> = { launch: "Launch", burn: "Burn", graduate: "Migration", trade: "Trade" };
const PLURAL: Record<ActivityType, string> = { launch: "Launches", burn: "Burns", graduate: "Migrations", trade: "Trades" };
const ORDER: ActivityType[] = ["launch", "burn", "graduate", "trade"];
/** Rarer events win the colour of a shared square. */
const RANK: ActivityType[] = ["graduate", "launch", "burn", "trade"];
const fmtT = (ts: number) => fmtTimeUS(ts, { second: "2-digit" });

type Bucket = { n: number; c: Record<ActivityType, number>; syms: string[] };
const emptyCounts = (): Record<ActivityType, number> => ({ launch: 0, burn: 0, graduate: 0, trade: 0 });

function bucketize(events: ActivityEvent[], from: number, to: number) {
  const map = new Map<number, Bucket>();
  for (const e of events) {
    const k = Math.floor(e.ts / BUCKET_MS);
    if (k < from || k > to) continue;
    let b = map.get(k);
    if (!b) map.set(k, (b = { n: 0, c: emptyCounts(), syms: [] }));
    b.n++;
    b.c[e.type]++;
    if (e.symbol && !b.syms.includes(e.symbol)) b.syms.push(e.symbol);
  }
  return map;
}

type CellState = "past" | "now" | "future";
const Cell = memo(function Cell({ k, size, color, level, state, hover }: { k: number; size: number; color: string | null; level: number; state: CellState; hover: boolean }) {
  const cls = [s.cell, color ? s.lit : "", state === "future" ? s.future : "", state === "now" ? s.now : "", hover ? s.hover : ""].join(" ");
  return <div data-k={k} className={cls} style={{ width: size, height: size, ...(color && state !== "future" ? { background: color, opacity: level } : null) }} />;
});

export function ActivityGrid({ className = "", bare = false }: { className?: string; bare?: boolean }) {
  const { events, source, now } = useActivity();
  const rootRef = useRef<HTMLDivElement>(null);
  const wallRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [small, setSmall] = useState(false);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<{ k: number; rect: DOMRect } | null>(null);
  useEffect(() => { const m = matchMedia("(max-width: 767px)"); const f = () => setSmall(m.matches); f(); m.addEventListener("change", f); return () => m.removeEventListener("change", f); }, []);
  const CELL = small ? 9 : 11;
  useEffect(() => {
    const el = wallRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const cols = width ? Math.max(12, Math.min(MAX_COLS, Math.floor((width + GAP) / (CELL + GAP)))) : 30;
  const pitch = cols > 1 && width ? (width - CELL) / (cols - 1) : CELL + GAP;

  // Window: `cols` whole minutes ending with the current one. `now` only moves on the hook's single timer.
  const curK = now ? Math.floor(now / BUCKET_MS) : 0;
  const curMin = Math.floor(curK / ROWS);
  const firstMin = curMin - cols + 1;
  const firstK = firstMin * ROWS;
  const lastK = curMin * ROWS + ROWS - 1;
  const buckets = useMemo(() => bucketize(events, firstK, curK), [events, firstK, curK]);
  const totals = useMemo(() => {
    const t = emptyCounts();
    buckets.forEach((b) => ORDER.forEach((x) => (t[x] += b.c[x])));
    return t;
  }, [buckets]);

  // Slide the wall one column left when a minute closes (FLIP on the track only, nothing else re-lays out).
  const prevFirst = useRef<number | null>(null);
  useLayoutEffect(() => {
    const el = trackRef.current;
    const prev = prevFirst.current;
    prevFirst.current = now ? firstMin : null;
    if (!el || prev === null || !now || firstMin <= prev) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    el.style.transition = "none";
    el.style.transform = `translate3d(${Math.min(firstMin - prev, 2) * pitch}px,0,0)`;
    void el.offsetWidth;
    el.style.transition = "transform 900ms cubic-bezier(.22,.7,.2,1)";
    el.style.transform = "translate3d(0,0,0)";
  }, [firstMin, now, pitch]);

  // One delegated handler for the whole wall; cells never get their own listeners.
  const pick = useCallback((target: EventTarget | null) => {
    const el = (target as HTMLElement | null)?.closest?.("[data-k]") as HTMLElement | null;
    if (!el) return setHover(null);
    const k = Number(el.dataset.k);
    setHover((h) => (h && h.k === k ? h : { k, rect: el.getBoundingClientRect() }));
  }, []);
  useEffect(() => {
    if (!hover) return;
    const off = () => setHover(null);
    const outside = (e: PointerEvent) => { if (!wallRef.current?.contains(e.target as Node)) off(); };
    window.addEventListener("scroll", off, { passive: true, capture: true });
    window.addEventListener("resize", off);
    document.addEventListener("pointerdown", outside);
    return () => { window.removeEventListener("scroll", off, { capture: true }); window.removeEventListener("resize", off); document.removeEventListener("pointerdown", outside); };
  }, [hover]);
  useEffect(() => { if (hover && (hover.k < firstK || hover.k > curK)) setHover(null); }, [hover, firstK, curK]);

  const cells = [];
  if (now) {
    for (let k = firstK; k <= lastK; k++) {
      const b = buckets.get(k);
      const state: CellState = k > curK ? "future" : k === curK ? "now" : "past";
      const type = b ? RANK.find((t) => b.c[t] > 0)! : null;
      const level = !b ? 1 : b.n >= 4 ? 1 : b.n >= 2 ? 0.82 : 0.62;
      cells.push(<Cell key={k} k={k} size={CELL} color={type ? COLOR[type] : null} level={level} state={state} hover={hover?.k === k} />);
    }
  }
  const ticks = [];
  for (let m = firstMin; m <= curMin; m++) {
    const d = new Date(m * 60_000);
    const mark = d.getMinutes() % 5 === 0;
    ticks.push(<span key={m} className={mark ? `${s.tick} ${d.getMinutes() === 0 ? s.tickHour : ""}` : ""} style={mark ? undefined : { height: 3 }} />);
  }
  const gridStyle = { gridTemplateColumns: `repeat(${cols}, ${CELL}px)`, justifyContent: "space-between" } as const;

  return (
    <div ref={rootRef} className={`relative flex min-w-0 flex-col p-3 md:p-5 ${bare ? "" : "rounded-lg border border-border bg-surface"} ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold">Protocol activity</h2>
          <span className="flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-ink-2">
            <span className="h-1.5 w-1.5 rounded-full bg-buy motion-safe:animate-pulse" />
            Live{source === "mock" ? " demo" : ""}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5" data-testid="activity-counts">
          <span className="text-[10px] text-ink-3" title="Totals for the squares shown">Last {cols} min</span>
          {ORDER.map((t) => (
            <span key={t} className="flex items-center gap-1.5 rounded-full border border-border bg-muted px-1.5 py-0.5 text-[10px] text-ink-3">
              <span className="h-2 w-2 rounded-[2px]" style={{ background: COLOR[t] }} />{PLURAL[t]} <span className="num font-semibold text-ink">{totals[t]}</span>
            </span>
          ))}
        </div>
      </div>
      <div className="mt-3 flex flex-1 items-center md:mt-5">
        <div ref={wallRef} className={`w-full overflow-hidden ${s.wall}`} role="img"
          aria-label={`Protocol activity, last ${cols} minutes in 10 second squares: ${ORDER.map((t) => `${PLURAL[t]} ${totals[t]}`).join(", ")}`}
          onPointerMove={(e) => pick(e.target)} onPointerDown={(e) => pick(e.target)} onPointerLeave={(e) => { if (e.pointerType === "mouse") setHover(null); }}>
          <div ref={trackRef} className={s.track} style={{ height: ROWS * CELL + (ROWS - 1) * GAP + 9 }}>
            <div className="grid grid-flow-col" style={{ ...gridStyle, gridTemplateRows: `repeat(${ROWS}, ${CELL}px)`, rowGap: GAP }}>{cells}</div>
            <div className="mt-1.5 grid items-start" style={gridStyle} aria-hidden>{ticks}</div>
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-ink-3 md:mt-4">
        <span className="tabular-nums">{cols} min ago</span>
        <span className="hidden items-center gap-3 md:flex">
          {ORDER.map((t) => (
            <span key={t} className="flex items-center gap-1.5"><span className="h-[9px] w-[9px] rounded-[2px]" style={{ background: COLOR[t] }} />{LABEL[t]}</span>
          ))}
        </span>
        <span className="flex items-center gap-1.5">Now<span className="h-[9px] w-[9px] rounded-[2px]" style={{ boxShadow: "0 0 0 1px var(--hb-gold-line)", background: "var(--hb-gold-soft)" }} /></span>
      </div>
      {hover && now ? <BucketTip k={hover.k} rect={hover.rect} bucket={buckets.get(hover.k)} live={hover.k === curK} bounds={rootRef.current?.getBoundingClientRect() ?? null} /> : null}
    </div>
  );
}

/** Shared hover panel, styled like InfoTip: fixed, kept inside the card and the viewport (shift), below the square unless there is no room (flip). */
function BucketTip({ k, rect, bucket, live, bounds }: { k: number; rect: DOMRect; bucket?: Bucket; live: boolean; bounds: DOMRect | null }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; arrow: number; below: boolean } | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const M = 8, w = el.offsetWidth, h = el.offsetHeight, vw = window.innerWidth, vh = window.innerHeight;
    const minL = Math.max(M, (bounds?.left ?? 0) + M), maxL = Math.min(vw - M, (bounds?.right ?? vw) - M) - w;
    const cx = rect.left + rect.width / 2;
    const left = Math.round(Math.max(minL, Math.min(maxL, cx - w / 2)));
    const below = rect.bottom + 8 + h <= vh - M || rect.top - 8 - h < M;
    const top = Math.round(below ? rect.bottom + 8 : rect.top - 8 - h);
    setPos({ top, left, below, arrow: Math.round(Math.max(10, Math.min(w - 10, cx - left))) });
  }, [rect, bounds, bucket]);
  const start = k * BUCKET_MS;
  const n = bucket?.n ?? 0;
  const syms = bucket?.syms ?? [];
  const types = bucket ? ORDER.filter((t) => bucket.c[t]).length : 0;
  return (
    <div ref={ref} data-hb-tip="" aria-hidden
      className="pointer-events-none fixed z-50 block w-max max-w-[240px] rounded-md border border-border bg-surface px-3 py-2.5 text-left text-xs leading-relaxed text-ink-2 shadow-card motion-safe:animate-[hb-panel-in_160ms_cubic-bezier(0,0,.2,1)]"
      style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999, boxShadow: "0 6px 24px rgba(0,0,0,.18)" }}>
      <span className="absolute h-2 w-2 rotate-45 border-border bg-surface"
        style={{ left: (pos?.arrow ?? 0) - 4, ...(pos?.below ? { top: -5, borderLeftWidth: 1, borderTopWidth: 1 } : { bottom: -5, borderRightWidth: 1, borderBottomWidth: 1 }) }} />
      <span className="flex items-center justify-between gap-3">
        <span className="font-medium tabular-nums text-ink">{fmtT(start)} to {fmtT(start + BUCKET_MS)}</span>
        {live ? <span className="hb-eyebrow" style={{ fontSize: 9.5 }}>Now</span> : null}
      </span>
      {n ? (
        <>
          <span className="mt-1.5 grid grid-cols-[auto_1fr_auto] items-center gap-x-2 gap-y-0.5">
            {ORDER.filter((t) => bucket!.c[t]).map((t) => (
              <span key={t} className="contents">
                <span className="h-2 w-2 rounded-[2px]" style={{ background: COLOR[t] }} />
                <span>{bucket!.c[t] === 1 ? ONE[t] : PLURAL[t]}</span>
                <span className="num text-right font-semibold text-ink">{bucket!.c[t]}</span>
              </span>
            ))}
          </span>
          <span className="mt-1.5 block border-t border-border pt-1.5 text-[11px] text-ink-3">
            {[types > 1 ? `${n} transactions` : "", syms.slice(0, 3).map((x) => `$${x}`).join(", ") + (syms.length > 3 ? "…" : "")].filter(Boolean).join(" · ")}
          </span>
        </>
      ) : (
        <span className="mt-1 block text-ink-3">{live ? "Waiting for activity…" : "No activity"}</span>
      )}
    </div>
  );
}
