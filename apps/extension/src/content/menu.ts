/** A compact custom dropdown (no native select): a button showing the current choice and a fixed listbox popover in the shadow
 *  root, styled like the header wallet dropdown. Mouse, arrow keys, Home, End, Enter and Space pick. Esc (through the drawer's
 *  Esc hook, see close()), Tab and an outside click close it. */
import { h } from "./dom";

export interface MenuOpt { value: string; label: string; sub?: string; title?: string }
export interface Menu { btn: HTMLButtonElement; pop: HTMLElement; set(opts: MenuOpt[], value: string): void; value(): string; close(): boolean; destroy(): void }

const CHECK = `<svg viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M2.5 6.2l2.3 2.3 4.7-5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
let seq = 0;

export function menu(root: ShadowRoot, o: { label: string; testid: string; onChange: (v: string) => void }): Menu {
  const id = `hbm${++seq}`;
  const text = h("span", { class: "hsv" });
  const btn = h("button", { class: "hsel", type: "button", "aria-haspopup": "listbox", "aria-expanded": "false", "aria-controls": id, "aria-label": o.label, "data-testid": o.testid }, text, h("span", { class: "chev" })) as HTMLButtonElement;
  const pop = h("div", { class: "hdrop", id, role: "listbox", hidden: true, tabindex: -1, "aria-label": o.label, "data-testid": `${o.testid}-menu` });
  let opts: MenuOpt[] = [], cur = "", act = 0;
  const rows = () => [...pop.querySelectorAll<HTMLElement>(".hopt")];
  const mark = (i: number) => { act = Math.max(0, Math.min(opts.length - 1, i)); rows().forEach((r, j) => r.classList.toggle("act", j === act)); rows()[act]?.scrollIntoView({ block: "nearest" }); pop.setAttribute("aria-activedescendant", `${id}-${act}`); };
  const draw = () => {
    pop.replaceChildren(...opts.map((x, i) => {
      const r = h("div", { class: "hopt", role: "option", id: `${id}-${i}`, "aria-selected": String(x.value === cur), title: x.title ?? "", "data-value": x.value },
        h("span", { class: "hck", html: x.value === cur ? CHECK : "" }), h("span", { class: "hol" }, x.label), x.sub ? h("span", { class: "hoa" }, x.sub) : null);
      r.addEventListener("pointermove", () => { if (act !== i) mark(i); });
      r.addEventListener("click", () => pick(i));
      return r;
    }));
    const c = opts.find((x) => x.value === cur) ?? opts[0];
    text.textContent = c ? (c.sub ? `${c.label} ${c.sub}` : c.label) : "";
    btn.title = c?.title ?? "";
  };
  const place = () => {
    const r = btn.getBoundingClientRect(), vw = document.documentElement.clientWidth || innerWidth;
    const w = Math.max(r.width, 180);
    pop.style.width = `${Math.round(w)}px`;
    pop.style.left = `${Math.round(Math.max(8, Math.min(r.left, vw - 8 - w)))}px`;
    const below = innerHeight - r.bottom - 8, ph = Math.min(pop.scrollHeight, 240);
    pop.style.top = `${Math.round(below >= ph || below >= r.top ? r.bottom + 4 : r.top - 4 - ph)}px`;
  };
  const isOpen = () => !pop.hidden;
  const show = () => { if (!opts.length) return; pop.hidden = false; btn.setAttribute("aria-expanded", "true"); place(); mark(Math.max(0, opts.findIndex((x) => x.value === cur))); pop.focus({ preventScroll: true }); };
  const close = (focus = true) => { if (!isOpen()) return false; pop.hidden = true; btn.setAttribute("aria-expanded", "false"); if (focus) btn.focus({ preventScroll: true }); return true; };
  const pick = (i: number) => { const x = opts[i]; close(); if (x && x.value !== cur) { cur = x.value; draw(); o.onChange(cur); } };
  btn.addEventListener("click", () => (isOpen() ? close() : show()));
  btn.addEventListener("keydown", (e) => { if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) { e.preventDefault(); show(); } });
  pop.addEventListener("keydown", (e) => {
    const k = e.key;
    if (k === "ArrowDown") mark(act + 1); else if (k === "ArrowUp") mark(act - 1); else if (k === "Home") mark(0); else if (k === "End") mark(opts.length - 1);
    else if (k === "Enter" || k === " ") pick(act); else if (k === "Tab") { close(false); return; } else return;
    e.preventDefault();
  });
  // Outside click: inside the shadow root anything but the button and the list, outside it anything but our own host
  const inside = (e: Event) => e.composedPath().some((n) => n === pop || n === btn);
  const onRoot = (e: Event) => { if (isOpen() && !inside(e)) close(false); };
  const onDoc = (e: Event) => { if (isOpen() && e.target !== root.host) close(false); };
  root.addEventListener("pointerdown", onRoot, true);
  document.addEventListener("pointerdown", onDoc, true);
  const onResize = () => { if (isOpen()) close(false); };
  addEventListener("resize", onResize);
  return {
    btn, pop,
    set(next, value) { opts = next; cur = next.some((x) => x.value === value) ? value : next[0]?.value ?? ""; draw(); if (isOpen()) place(); },
    value: () => cur,
    close: () => close(),
    destroy() { root.removeEventListener("pointerdown", onRoot, true); document.removeEventListener("pointerdown", onDoc, true); removeEventListener("resize", onResize); pop.remove(); },
  };
}

