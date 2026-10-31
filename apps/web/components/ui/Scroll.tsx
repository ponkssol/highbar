"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/** Tracks whether a horizontal scroller has hidden content on its left or right, so the edge fades only show when there is more to see. */
export function useScrollEdges<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [edge, setEdge] = useState({ l: false, r: false });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const up = () => {
      const l = el.scrollLeft > 1, r = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
      setEdge((p) => (p.l === l && p.r === r ? p : { l, r }));
    };
    up();
    el.addEventListener("scroll", up, { passive: true });
    const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(up);
    ro?.observe(el);
    if (el.firstElementChild) ro?.observe(el.firstElementChild);
    return () => { el.removeEventListener("scroll", up); ro?.disconnect(); };
  }, []);
  return { ref, edge };
}

const FADE = "pointer-events-none absolute inset-y-0 z-[2] w-8 transition-opacity duration-200";

/** Edge fades over a horizontal scroller. `tone` matches the surface under it (card surface or page background). */
function Fades({ edge, tone }: { edge: { l: boolean; r: boolean }; tone: "surface" | "bg" }) {
  const from = tone === "bg" ? "from-bg" : "from-surface";
  return (
    <>
      <span aria-hidden className={cx(FADE, "left-0 bg-gradient-to-r to-transparent", from, edge.l ? "opacity-100" : "opacity-0")} />
      <span aria-hidden className={cx(FADE, "right-0 bg-gradient-to-l to-transparent", from, edge.r ? "opacity-100" : "opacity-0")} />
    </>
  );
}

/** Horizontal scroll wrapper for a wide table. Only the table scrolls: titles and the card edge stay put. `sticky` pins the first column
 *  (with a hairline once scrolled) and the right edge fades while more columns are hidden. */
export function TableScroll({ children, sticky = false, className = "", label }: { children: ReactNode; sticky?: boolean; className?: string; label?: string }) {
  const { ref, edge } = useScrollEdges<HTMLDivElement>();
  return (
    <div className={cx("relative", className)}>
      <div ref={ref} className={cx("overflow-x-auto", sticky && "hb-sticky-first")} data-scrolled={edge.l ? "" : undefined}
        tabIndex={edge.r || edge.l ? 0 : undefined} role={edge.r || edge.l ? "region" : undefined} aria-label={edge.r || edge.l ? label ?? "Scrollable table" : undefined}>
        {children}
      </div>
      <Fades edge={sticky ? { l: false, r: edge.r } : edge} tone="surface" />
    </div>
  );
}

/** Horizontal scroller for a row of tabs or pills: hidden scrollbar, soft edge fades, and the selected item kept in view. */
export function ScrollRow({ children, className = "", innerClassName = "", tone = "bg", active }: {
  children: ReactNode; className?: string; innerClassName?: string; tone?: "surface" | "bg"; active?: string;
}) {
  const { ref, edge } = useScrollEdges<HTMLDivElement>();
  useEffect(() => {
    const el = ref.current;
    const on = el?.querySelector<HTMLElement>('[aria-selected="true"],[aria-current="page"],[data-on="true"]');
    if (!el || !on) return;
    const l = on.offsetLeft - el.offsetLeft, r = l + on.offsetWidth;
    if (l < el.scrollLeft + 24 || r > el.scrollLeft + el.clientWidth - 24) {
      el.scrollTo({ left: Math.max(0, l - el.clientWidth / 2 + on.offsetWidth / 2), behavior: "smooth" });
    }
  }, [active, ref]);
  return (
    <div className={cx("relative min-w-0", className)}>
      <div ref={ref} className={cx("no-scrollbar overflow-x-auto", innerClassName)}>{children}</div>
      <Fades edge={edge} tone={tone} />
    </div>
  );
}
