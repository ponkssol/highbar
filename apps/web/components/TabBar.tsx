"use client";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { ScrollRow } from "./ui/Scroll";

/** Shared tab motion: one sliding indicator (transform only), a short crossfade between panels and the active tab kept in the URL
 *  without a navigation. Every tab set and segmented control on the site uses these so they all move the same way. */

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;
const reducedMotion = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/** Places `ind` under the item with data-tab-id = active. Width is set once per move and the slide itself is FLIP: start at the
 *  old offset and old scale, then transition to translateX(new) scaleX(1). Only transform animates, so nothing reflows mid-move.
 *  `ready` stays false until the first measure: until then the active item draws its own static state (SSR, no JS). */
export function useSlidingIndicator(active: string) {
  const list = useRef<HTMLDivElement>(null);
  const ind = useRef<HTMLSpanElement>(null);
  const last = useRef<{ x: number; w: number } | null>(null);
  const [ready, setReady] = useState(false);

  const place = useCallback((animate: boolean) => {
    const l = list.current, i = ind.current;
    const el = l?.querySelector<HTMLElement>(`[data-tab-id="${CSS.escape(active)}"]`);
    if (!l || !i || !el) return;
    const x = el.offsetLeft, w = el.offsetWidth;
    if (!w) return;
    const p = last.current;
    last.current = { x, w };
    if (p && p.x === x && p.w === w) return;
    i.style.width = `${w}px`;
    if (animate && p && p.w > 0 && !reducedMotion()) {
      i.style.transition = "none";
      i.style.transform = `translateX(${p.x}px) scaleX(${p.w / w})`;
      void i.offsetWidth; // commit the start frame before re-enabling the transition
      i.style.transition = "";
    } else {
      i.style.transition = "none";
      i.style.transform = `translateX(${x}px)`;
      void i.offsetWidth;
      i.style.transition = "";
      return;
    }
    i.style.transform = `translateX(${x}px)`;
  }, [active]);

  useIsoLayoutEffect(() => { place(true); setReady(true); }, [place]);
  useEffect(() => {
    const l = list.current;
    if (!l || typeof ResizeObserver === "undefined") return;
    // Fonts, counts in labels and viewport changes: re-measure without a slide.
    const ro = new ResizeObserver(() => place(false));
    ro.observe(l);
    for (const c of Array.from(l.children)) ro.observe(c);
    document.fonts?.ready.then(() => place(false)).catch(() => {});
    return () => ro.disconnect();
  }, [place]);

  return { list, ind, ready };
}

let releaseFloor: ((restore: boolean) => string) | null = null;

/** Called right before a tab or filter switch. The new panel can be shorter than the old one (or show a short skeleton first), and
 *  when the page gets shorter than the scrolled position the browser pulls everything up, tab bar included. So the body keeps at
 *  least the height that is on screen now. The floor only shrinks as the reader scrolls back up and is gone once it no longer
 *  holds anything, so it never adds space they can scroll into. */
export function holdScrollFloor() {
  if (typeof window === "undefined" || window.scrollY <= 0) return;
  const body = document.body;
  // A floor left by an earlier switch is swapped in place. Letting it go first would shrink the page and pull the scroll up.
  const prev = releaseFloor ? releaseFloor(false) : body.style.minHeight;
  let floor = Math.ceil(window.scrollY + window.innerHeight);
  body.style.minHeight = `${floor}px`;
  const onScroll = () => {
    const need = Math.ceil(window.scrollY + window.innerHeight);
    if (need >= floor) return;
    floor = need;
    if (window.scrollY <= 0) { release(true); return; }
    body.style.minHeight = `${floor}px`;
  };
  const release = (restore: boolean) => { window.removeEventListener("scroll", onScroll); if (restore) body.style.minHeight = prev; releaseFloor = null; return prev; };
  window.addEventListener("scroll", onScroll, { passive: true });
  releaseFloor = release;
}

export type TabItem<T extends string> = { id: T; label: ReactNode; href?: string; testId?: string };

const plainClick = (e: MouseEvent) => e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;

/** The one tab look used on every page: a dark rounded pill track, a warm filled pill under the active tab (it slides, transform
 *  only) and muted text on the rest. Rows that do not fit scroll sideways with a hidden scrollbar, edge fades and the active tab
 *  kept in view, so nothing wraps or clips at 390 or 360. */
const SEG_TRACK = "relative inline-flex w-max items-center gap-0.5 rounded-full border border-seg-line bg-seg p-1";
const SEG_ITEM = "relative z-[1] inline-flex h-8 items-center justify-center whitespace-nowrap rounded-full px-3.5 text-[13px] leading-none transition-colors duration-200";
// One weight for on and off: a bolder active label is wider, so the pills (and every tab after them) would nudge sideways on a switch.
const SEG_ON = "font-medium text-seg-on-ink";
const SEG_OFF = "font-medium text-ink-3 hover:text-ink-2";
const SEG_IND = "inset-y-1 rounded-full bg-seg-on";

type Frame = { scroll?: boolean; fade?: "bg" | "surface"; outerClassName?: string; innerClassName?: string };

/** Wraps a track in the shared horizontal scroller unless the caller lays it out itself (`scroll={false}`). */
function SegFrame({ children, active, scroll = true, fade = "bg", outerClassName = "", innerClassName = "" }: Frame & { children: ReactNode; active: string }) {
  if (!scroll) return <>{children}</>;
  return <ScrollRow active={active} tone={fade} className={outerClassName} innerClassName={innerClassName}>{children}</ScrollRow>;
}

/** Page level tabs: the hub pages and the token page. Items with `href` render as links (middle click still opens a new tab). */
export function TabBar<T extends string>({ items, value, onSelect, label, className = "", testId, ...frame }: {
  items: TabItem<T>[]; value: T; onSelect: (id: T) => void; label: string; className?: string; testId?: string;
} & Frame) {
  const { list, ind, ready } = useSlidingIndicator(value);
  return (
    <SegFrame active={value} {...frame}>
      <div ref={list} role="tablist" aria-label={label} data-testid={testId} className={cx(SEG_TRACK, className)}>
        <span ref={ind} aria-hidden className={cx("hb-tab-ind", SEG_IND, !ready && "opacity-0")} />
        {items.map((t) => {
          const on = t.id === value;
          const cls = cx(SEG_ITEM, on ? SEG_ON : SEG_OFF, on && !ready && "bg-seg-on");
          const common = { "data-tab-id": t.id, "data-testid": t.testId, role: "tab", "aria-selected": on, className: cls } as const;
          return t.href ? (
            <a key={t.id} {...common} href={t.href} aria-current={on ? "page" : undefined} onClick={(e) => { if (!plainClick(e)) return; e.preventDefault(); if (!on) holdScrollFloor(); onSelect(t.id); }}>{t.label}</a>
          ) : (
            <button key={t.id} {...common} type="button" onClick={() => { if (!on) holdScrollFloor(); onSelect(t.id); }}>{t.label}</button>
          );
        })}
      </div>
    </SegFrame>
  );
}

/** Segmented control in the same pill look as TabBar. `tone="trade"` keeps the buy and sell colours on the active pill, every other
 *  tone renders the shared warm pill. `fill` stretches the track and splits it evenly (the trade side switch). `tabId` and
 *  `controls` wire the tabs to an external tabpanel. */
export function Segmented<T extends string>({ options, value, onChange, label, tone, fill = false, className = "", itemClassName = "", tabId, controls, ...frame }: {
  options: { id: T; label: ReactNode }[]; value: T; onChange: (v: T) => void; label?: string;
  tone?: "pill" | "trade"; fill?: boolean; className?: string; itemClassName?: string;
  tabId?: (id: T) => string; controls?: string;
} & Frame) {
  const { list, ind, ready } = useSlidingIndicator(value);
  const trade = tone === "trade";
  const pill = trade ? (value === "sell" ? "bg-sell" : "bg-buy") : "bg-seg-on";
  const onText = trade ? "font-semibold text-on-ink" : SEG_ON;
  return (
    <SegFrame active={value} {...frame} scroll={fill ? false : frame.scroll}>
      <div ref={list} role="tablist" aria-label={label} className={cx(SEG_TRACK, fill && "!flex !w-full", className)}>
        <span ref={ind} aria-hidden className={cx("hb-tab-ind inset-y-1 rounded-full", pill, !ready && "opacity-0")} />
        {options.map((o) => {
          const on = o.id === value;
          return (
            <button key={o.id} data-tab-id={o.id} id={tabId?.(o.id)} aria-controls={controls} type="button" role="tab" aria-selected={on} onClick={() => { if (!on) holdScrollFloor(); onChange(o.id); }}
              className={cx(SEG_ITEM, fill && "flex-1", on ? onText : SEG_OFF, on && !ready && pill, itemClassName)}>{o.label}</button>
          );
        })}
      </div>
    </SegFrame>
  );
}

type Layer = { k: string; node: ReactNode; out: boolean; anim: boolean };

/** Panel area for a tab set. On a switch the old panel stays mounted on top (absolute, fading out, inert) while the new one fades in
 *  from 5px below, both opacity and transform only. The box keeps the old panel's height as min-height until the new panel has no
 *  loading skeleton left (role=status) or 1.5s passed, so nothing below jumps while it loads. */
export function TabPanels({ k, children, className = "" }: { k: string; children: ReactNode; className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [st, setSt] = useState<{ k: string; prev: Layer | null; minH: number | null; anim: boolean }>({ k, prev: null, minH: null, anim: false });
  const lastNode = useRef<ReactNode>(children);

  let s = st;
  if (st.k !== k) {
    // Derived state during render (React pattern): capture the outgoing panel and its height before the DOM changes.
    const reduce = reducedMotion();
    s = { k, prev: reduce ? null : { k: st.k, node: lastNode.current, out: true, anim: true }, minH: box.current?.offsetHeight ?? null, anim: !reduce };
    setSt(s);
  }
  lastNode.current = children;

  useEffect(() => {
    if (!s.prev) return;
    const t = setTimeout(() => setSt((c) => (c.k === s.k ? { ...c, prev: null } : c)), 200);
    return () => clearTimeout(t);
  }, [s.k, s.prev]);

  useEffect(() => {
    if (s.minH == null) return;
    const started = Date.now();
    let id = 0;
    const tick = () => {
      const cur = box.current?.querySelector(`[data-panel="${CSS.escape(s.k)}"]`);
      const busy = !!cur?.querySelector("[role=status]");
      if ((Date.now() - started > 260 && !busy) || Date.now() - started > 1500) { setSt((c) => (c.k === s.k ? { ...c, minH: null } : c)); return; }
      id = window.setTimeout(tick, 60);
    };
    id = window.setTimeout(tick, 60);
    return () => clearTimeout(id);
  }, [s.k, s.minH]);

  const layers: Layer[] = [...(s.prev && s.prev.k !== k ? [s.prev] : []), { k, node: children, out: false, anim: s.anim }];
  return (
    <div ref={box} className={cx("relative", className)} style={s.minH != null ? { minHeight: s.minH } : undefined}>
      {layers.map((l) => (
        <div key={l.k} data-panel={l.k} role={l.out ? undefined : "tabpanel"} aria-hidden={l.out || undefined} inert={l.out || undefined}
          className={l.out ? "hb-panel-out pointer-events-none absolute inset-x-0 top-0" : l.anim ? "hb-panel-in" : undefined}>
          {l.node}
        </div>
      ))}
    </div>
  );
}

/** Tab state mirrored to `?<param>=` with history.replaceState: no navigation, no RSC request, no scroll jump. Pages that SSR
 *  the tab (the hubs) pass `initial` from useSearchParams; client-only pages read the URL after mount. */
export function useUrlTab<T extends string>(ids: readonly T[], fallback: T, { param = "tab", initial }: { param?: string; initial?: string | null } = {}) {
  const pick = useCallback((v: string | null | undefined) => (ids.includes(v as T) ? (v as T) : fallback), [ids, fallback]);
  const [tab, setTab] = useState<T>(() => pick(initial));
  useEffect(() => {
    if (initial !== undefined) return;
    const v = new URLSearchParams(window.location.search).get(param);
    if (v && ids.includes(v as T)) setTab(v as T);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { if (initial !== undefined) setTab(pick(initial)); }, [initial, pick]);
  const select = useCallback((id: T) => {
    setTab(id);
    const u = new URL(window.location.href);
    if (u.searchParams.get(param) === id) return;
    u.searchParams.set(param, id);
    window.history.replaceState(null, "", `${u.pathname}${u.search}${u.hash}`);
  }, [param]);
  return [tab, select] as const;
}
