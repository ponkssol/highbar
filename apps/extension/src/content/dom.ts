/** Content script helpers shared by the drawer and the Holding panel. */
import type { Reply, Req, Res } from "../lib/messages";

export async function ask<T extends Req>(req: T): Promise<Res<T["type"]>> {
  const r = (await chrome.runtime.sendMessage(req)) as Reply<Res<T["type"]>> | undefined;
  if (!r) throw new Error("The extension was updated. Reload this page.");
  if (!r.ok) throw Object.assign(new Error(r.error), { code: r.code });
  return r.data;
}

// ---- tiny DOM helper (text only goes through textContent) ----
export type Attrs = Record<string, string | boolean | number | undefined | ((e: Event) => void)>;
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...kids: (Node | string | null | false | undefined)[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === false) continue;
    if (typeof v === "function") el.addEventListener(k.replace(/^on/, ""), v as EventListener);
    else if (k === "html") el.innerHTML = String(v); // static icon markup only
    else el.setAttribute(k, v === true ? "" : String(v));
  }
  for (const c of kids) if (c !== null && c !== false && c !== undefined) el.append(c);
  return el;
}
export const svg = (markup: string) => { const s = document.createElement("span"); s.style.display = "inline-flex"; s.innerHTML = markup; return s; };

/** A soft fade at the top and or bottom edge of a scroll area while more content is hidden there (the scrollbar is hidden). */
export function scrollFade<T extends HTMLElement>(el: T): T {
  const upd = () => {
    const max = el.scrollHeight - el.clientHeight;
    el.classList.toggle("fade-t", max > 1 && el.scrollTop > 1);
    el.classList.toggle("fade-b", max > 1 && el.scrollTop < max - 1);
  };
  el.addEventListener("scroll", upd, { passive: true });
  const ro = new ResizeObserver(upd); ro.observe(el);
  new MutationObserver(() => { upd(); for (const c of el.children) ro.observe(c); }).observe(el, { childList: true, subtree: true });
  return el;
}
