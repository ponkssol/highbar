"use client";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";

/** Small circled "i" that reveals helper text. Desktop opens on hover and keyboard focus, touch opens on tap.
 *  An outside tap or Esc closes it. The panel stays in the DOM while closed (visually hidden), so the id can sit in a field's aria-describedby.
 *  Clicks never bubble, so the icon can sit on a tier card or next to a label without selecting or focusing anything else.
 *  Open, the panel is fixed to the viewport and clamped (flips above the icon when there is no room below). */
export function InfoTip({ label, children, id, className = "", width = 264 }: { label: string; children: ReactNode; id?: string; className?: string; width?: number }) {
  const auto = useId();
  const tipId = id ?? `tip-${auto.replace(/:/g, "")}`;
  const btn = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLSpanElement>(null);
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number; w: number; above: boolean; arrow: number } | null>(null);
  const leave = useRef<ReturnType<typeof setTimeout> | null>(null);
  const open = hover || focus || pinned;
  const closeAll = useCallback(() => { setHover(false); setFocus(false); setPinned(false); }, []);

  const place = useCallback(() => {
    const b = btn.current?.getBoundingClientRect(); const p = panel.current;
    if (!b || !p) return;
    const vw = document.documentElement.clientWidth, vh = window.innerHeight, m = 8, gap = 8;
    const w = Math.min(width, vw - m * 2);
    p.style.width = `${w}px`;
    const h = p.offsetHeight;
    const cx = b.left + b.width / 2;
    const left = Math.min(Math.max(cx - w / 2, m), vw - w - m);
    const below = b.bottom + gap, above = b.top - gap - h;
    const flip = below + h > vh - m && above >= m;
    setPos({ left, top: flip ? above : below, w, above: flip, arrow: Math.min(Math.max(cx - left, 12), w - 12) });
  }, [width]);

  useLayoutEffect(() => { if (open) place(); else setPos(null); }, [open, place]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); closeAll(); } };
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (btn.current?.contains(t) || panel.current?.contains(t)) return;
      closeAll();
    };
    const onMove = () => place();
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("pointerdown", onDown, true);
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
    };
  }, [open, place, closeAll]);
  useEffect(() => () => { if (leave.current) clearTimeout(leave.current); }, []);

  const enter = (e: React.PointerEvent) => { if (e.pointerType !== "mouse") return; if (leave.current) clearTimeout(leave.current); setHover(true); };
  const exit = (e: React.PointerEvent) => { if (e.pointerType !== "mouse") return; leave.current = setTimeout(() => setHover(false), 120); };
  const stop = (e: React.SyntheticEvent) => { e.stopPropagation(); };

  return (
    <span className={`inline-flex align-middle ${className}`} onClick={stop} onPointerDown={stop}>
      <button ref={btn} type="button" aria-label={label} aria-expanded={open} aria-controls={tipId} aria-describedby={tipId}
        onPointerEnter={enter} onPointerLeave={exit}
        onFocus={(e) => { if (e.currentTarget.matches(":focus-visible")) setFocus(true); }} onBlur={() => setFocus(false)}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPinned((p) => (hover && !p ? true : !p)); }}
        className={`relative inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-ink-3 outline-none before:absolute before:-inset-1.5 before:content-[''] hover:text-ink-2 focus-visible:text-ink focus-visible:ring-1 focus-visible:ring-gold-line ${open ? "text-ink-2" : ""}`}>
        <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
          <circle cx="8" cy="8" r="6.75" stroke="currentColor" strokeWidth="1" opacity=".8" />
          <circle cx="8" cy="5" r=".85" fill="currentColor" />
          <path d="M8 7.1v4.2" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
        </svg>
      </button>
      <span ref={panel} id={tipId} role="tooltip" data-hb-tip="" data-open={open && !!pos ? "true" : "false"}
        onPointerEnter={enter} onPointerLeave={exit}
        style={open && pos ? { left: pos.left, top: pos.top, width: pos.w } : open ? { left: 0, top: 0, visibility: "hidden" } : undefined}
        className={open
          ? `fixed z-50 block rounded-md border border-border bg-surface px-3 py-2.5 text-left text-xs font-normal normal-case leading-relaxed tracking-normal text-ink-2 shadow-card motion-safe:animate-[hb-panel-in_160ms_cubic-bezier(0,0,.2,1)]`
          : "sr-only"}>
        {children}
      </span>
    </span>
  );
}
