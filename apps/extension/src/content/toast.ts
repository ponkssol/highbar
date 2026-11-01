/** One toast host for the whole page: a fixed strip at the top center, in its own closed shadow root. Notices from the Trade
 *  popup and the launch drawer (success · View tx, errors, info) slide down there, stay 1.5 s (errors 2 s, hover pauses),
 *  then slide up. The strip ignores the pointer; only a toast and its link take clicks. CSS transforms only; with reduced
 *  motion they just fade. content.js and the lazily loaded ca-popup.js share it through the content script's own global. */
import { pushToast, safeTxHref, toastMs, type ToastItem, type ToastKind } from "../lib/toastq";
import { h } from "./dom";

const SANS = `"HB Inter",Inter,system-ui,-apple-system,"Segoe UI",sans-serif`;
const CSS = `:host{all:initial}
.wrap{position:fixed;top:10px;left:50%;transform:translateX(-50%);z-index:2147483647;display:flex;flex-direction:column;align-items:center;gap:6px;pointer-events:none;width:max-content;max-width:calc(100vw - 24px)}
.t{pointer-events:auto;display:flex;align-items:center;gap:8px;max-width:min(440px,calc(100vw - 24px));min-height:30px;box-sizing:border-box;padding:5px 14px 5px 10px;border-radius:999px;background:#12100D;border:1px solid rgba(255,199,44,.42);box-shadow:0 10px 26px rgba(0,0,0,.45);font:500 12px/1.3 ${SANS};color:#F3EEDF;transform:translateY(calc(-100% - 16px));opacity:0;transition:transform .24s cubic-bezier(.2,.8,.2,1),opacity .2s ease}
.t.in{transform:none;opacity:1}
.t.out{transform:translateY(calc(-100% - 16px));opacity:0}
.t i{flex:none;width:7px;height:7px;border-radius:50%;background:#FFC72C;box-shadow:0 0 0 3px rgba(255,199,44,.14)}
.t.ok{background:linear-gradient(90deg,rgba(76,182,122,.16),rgba(76,182,122,0) 60%),#12100D}.t.ok i{background:#4CB67A;box-shadow:0 0 0 3px rgba(76,182,122,.16)}
.t.err{background:linear-gradient(90deg,rgba(224,106,92,.18),rgba(224,106,92,0) 60%),#12100D}.t.err i{background:#E06A5C;box-shadow:0 0 0 3px rgba(224,106,92,.16)}
.t span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.t a{flex:none;color:#FFC72C;font-weight:600;text-decoration:none}.t a:hover{text-decoration:underline}
@media (prefers-reduced-motion:reduce){.t,.t.out{transform:none;transition:opacity .2s ease}}`;

export interface Toasts { show(kind: ToastKind, text: string, href?: string): void }
const G = globalThis as unknown as { __hbToasts?: Toasts };

function create(): Toasts {
  let wrap: HTMLElement | null = null, n = 0, list: ToastItem[] = [];
  const els = new Map<number, { el: HTMLElement; left: number; at: number; timer: ReturnType<typeof setTimeout> | null }>();
  const mount = () => {
    if (wrap?.isConnected) return wrap;
    const host = h("div", { "data-hb-toasts": "" });
    const root = host.attachShadow({ mode: "closed" });
    const st = document.createElement("style"); st.textContent = CSS;
    wrap = h("div", { class: "wrap", "data-testid": "hb-toasts" });
    root.append(st, wrap);
    document.documentElement.append(host);
    els.clear(); list = [];
    return wrap;
  };
  const leave = (id: number) => {
    const x = els.get(id); if (!x) return;
    els.delete(id); list = list.filter((t) => t.id !== id);
    if (x.timer) clearTimeout(x.timer);
    x.el.classList.remove("in"); x.el.classList.add("out");
    setTimeout(() => x.el.remove(), 260);
  };
  const arm = (id: number) => { const x = els.get(id); if (!x) return; x.at = Date.now(); x.timer = setTimeout(() => leave(id), x.left); };
  return {
    show(kind, text, href) {
      const w = mount(), id = ++n, link = safeTxHref(href);
      const r = pushToast(list, { id, kind, text, href: link, key: `${kind}|${text}` });
      list = r.list; r.drop.forEach(leave);
      const el = h("div", { class: `t ${kind}`, role: kind === "err" ? "alert" : "status", "data-testid": "hb-toast", "data-kind": kind },
        h("i", {}), h("span", { title: text }, text), link ? h("a", { href: link, target: "_blank", rel: "noopener noreferrer", "data-testid": "hb-toast-link" }, "View tx") : null);
      const x = { el, left: toastMs(kind), at: 0, timer: null as ReturnType<typeof setTimeout> | null };
      els.set(id, x);
      // hover pauses the timer, leaving resumes it with what was left
      el.addEventListener("pointerenter", () => { if (x.timer) { clearTimeout(x.timer); x.timer = null; x.left = Math.max(600, x.left - (Date.now() - x.at)); } });
      el.addEventListener("pointerleave", () => { if (!x.timer && els.has(id)) arm(id); });
      w.append(el);
      requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("in")));
      arm(id);
    },
  };
}
/** The page's toast host (created on first use). */
export const toasts = (): Toasts => (G.__hbToasts ??= create());
