/** Live number text that glides from the old value to the new one (requestAnimationFrame, ~500 ms) instead of flashing.
 *  The element is never replaced; only its text changes, and only when the formatted text does. A very light up or down tint
 *  fades in and out with a CSS color transition (no blinking). */
import { tweenAt } from "../lib/tween";

type St = { cur: number | null; raf: number; tint: ReturnType<typeof setTimeout> | null };
const state = new WeakMap<HTMLElement, St>();
const reduced = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

export function tweenText(el: HTMLElement | null, to: number | null, fmt: (n: number | null) => string, ms = 500): void {
  if (!el) return;
  let s = state.get(el);
  if (!s) { s = { cur: null, raf: 0, tint: null }; state.set(el, s); }
  const st = s;
  const write = (v: number | null) => { const t = fmt(v); if (el.textContent !== t) el.textContent = t; };
  if (st.raf) { cancelAnimationFrame(st.raf); st.raf = 0; }
  const from = st.cur;
  if (to === null || !Number.isFinite(to) || from === null || from === to || reduced() || document.visibilityState !== "visible") {
    st.cur = to; write(to); return;
  }
  // tint by direction, cleared after the glide (color transition in CSS)
  el.setAttribute("data-dir", to > from ? "up" : "dn");
  if (st.tint) clearTimeout(st.tint);
  st.tint = setTimeout(() => { el.removeAttribute("data-dir"); st.tint = null; }, ms + 250);
  const t0 = performance.now();
  const step = (now: number) => {
    const t = (now - t0) / ms;
    st.cur = t >= 1 ? to : tweenAt(from, to, t);
    write(st.cur);
    st.raf = t >= 1 ? 0 : requestAnimationFrame(step);
  };
  st.raf = requestAnimationFrame(step);
}
/** Stops every running glide on these elements (popup closed). */
export function stopTweens(els: (HTMLElement | null)[]): void {
  for (const el of els) { const s = el && state.get(el); if (s) { if (s.raf) cancelAnimationFrame(s.raf); if (s.tint) clearTimeout(s.tint); s.raf = 0; } }
}
