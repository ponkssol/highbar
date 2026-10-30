"use client";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";

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

export type TabItem<T extends string> = { id: T; label: ReactNode; href?: string };

const plainClick = (e: MouseEvent) => e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;

/** Underline tabs: the hub pages and the token page. Items with `href` render as links (middle click still opens a new tab). */
export function TabBar<T extends string>({ items, value, onSelect, label, className = "", testId }: {
  items: TabItem<T>[]; value: T; onSelect: (id: T) => void; label: string; className?: string; testId?: string;
}) {
  const { list, ind, ready } = useSlidingIndicator(value);
  return (
    <div ref={list} role="tablist" aria-label={label} data-testid={testId} className={cx("relative flex gap-5", className)}>
      {items.map((t) => {
        const on = t.id === value;
        const cls = cx("relative whitespace-nowrap pb-3 pt-1 text-sm", on ? "font-medium text-ink" : "text-ink-3 hover:text-ink", on && !ready && "shadow-[inset_0_-2px_0_var(--hb-gold)]");
        const common = { "data-tab-id": t.id, role: "tab", "aria-selected": on, className: cls } as const;
        return t.href ? (
          <a key={t.id} {...common} href={t.href} aria-current={on ? "page" : undefined} onClick={(e) => { if (!plainClick(e)) return; e.preventDefault(); onSelect(t.id); }}>{t.label}</a>
        ) : (
          <button key={t.id} {...common} type="button" onClick={() => onSelect(t.id)}>{t.label}</button>
        );
      })}
      <span ref={ind} aria-hidden className={cx("hb-tab-ind bottom-0 h-0.5 rounded-full bg-gold", !ready && "opacity-0")} />
    </div>
  );
}

/** Pill segmented control. `tone` picks the pill look: soft gold (default, same as hb-ctrl-on), a borderless soft gold pill, the chart's
 *  gold ring, or buy and sell. `tabId` and `controls` wire the tabs to an external tabpanel. */
export function Segmented<T extends string>({ options, value, onChange, label, tone = "gold", className = "", itemClassName = "", indClassName = "inset-y-1", tabId, controls }: {
  options: { id: T; label: ReactNode }[]; value: T; onChange: (v: T) => void; label?: string;
  tone?: "gold" | "soft" | "ring" | "trade"; className?: string; itemClassName?: string; indClassName?: string;
  tabId?: (id: T) => string; controls?: string;
}) {
  const { list, ind, ready } = useSlidingIndicator(value);
  const pill = tone === "ring" ? "rounded-md bg-gold-soft ring-1 ring-gold-line" : tone === "trade" ? (value === "sell" ? "rounded-full bg-sell" : "rounded-full bg-buy") : tone === "soft" ? "rounded-full bg-gold-soft" : "rounded-full border hb-ctrl-on";
  const onText = tone === "trade" ? "text-on-ink" : tone === "ring" ? "font-semibold text-gold-text" : "font-medium text-ink";
  const offText = tone === "ring" ? "text-ink-3 hover:text-ink" : tone === "soft" ? "font-medium text-ink-3 hover:text-ink" : "text-ink-2 hover:text-ink";
  return (
    <div ref={list} role="tablist" aria-label={label} className={cx("relative", className)}>
      <span ref={ind} aria-hidden className={cx("hb-tab-ind", indClassName, pill, !ready && "opacity-0")} />
      {options.map((o) => {
        const on = o.id === value;
        return (
          <button key={o.id} data-tab-id={o.id} id={tabId?.(o.id)} aria-controls={controls} type="button" role="tab" aria-selected={on} onClick={() => onChange(o.id)}
            className={cx("relative z-[1] whitespace-nowrap", on ? onText : offText, on && !ready && pill, itemClassName)}>{o.label}</button>
        );
      })}
    </div>
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
