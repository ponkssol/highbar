/** The CA popup's Token Audit strip: one row of four small shields (mint authority, freeze authority = "blacklist", LP burn,
 *  top 10 holders), green when the check passes, amber or red when it does not, grey while unknown. Hovering or focusing a
 *  shield shows a small tooltip with what it checks and this token's result (auditShields, the same words as the side panel);
 *  the same text is the shield's aria-label. Built once, updated in place; when the audit fails it hides itself. */
import { h } from "./dom";
import type { TokenAudit } from "../lib/audit";
import { auditShields } from "../lib/audit";

/** A small shield before each label (stroke icon, currentColor: it takes the chip's level color). */
const SHIELD = `<svg class="ash" viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false"><path d="M8 1.6 13.2 3.5v4.1c0 3.2-2.2 5.6-5.2 6.8-3-1.2-5.2-3.6-5.2-6.8V3.5L8 1.6Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>`;
const SRC = "On-chain, read through your RPC";

export function auditCard(): { el: HTMLElement; set(a: TokenAudit | null): void } {
  const chips = new Map<string, { chip: HTMLElement; lab: HTMLElement; mk: HTMLElement; tip: string }>();
  const row = h("div", { class: "achips", role: "list" });
  // one tooltip for the four shields, fixed positioned at the shadow root (no scroll area clips it), above the shield or below
  const tt = h("span", { class: "tpanel atip", role: "tooltip" }), ttMain = h("span"), ttSrc = h("span", { class: "asrc" }, SRC);
  tt.append(ttMain, ttSrc);
  let cur: HTMLElement | null = null;
  const show = (c: HTMLElement) => {
    const rn = c.getRootNode();
    if (rn instanceof ShadowRoot && tt.parentNode !== rn) rn.append(tt);
    cur = c; ttMain.textContent = chips.get(c.dataset.k!)?.tip ?? ""; tt.classList.add("on");
    const r = c.getBoundingClientRect(), pw = tt.offsetWidth, ph = tt.offsetHeight, vw = document.documentElement.clientWidth || innerWidth;
    const x = Math.max(4, Math.min(r.left + r.width / 2 - pw / 2, vw - 4 - pw)), y = r.top - 6 - ph >= 4 ? r.top - 6 - ph : r.bottom + 6;
    tt.style.left = `${Math.round(x)}px`; tt.style.top = `${Math.round(y)}px`;
  };
  const hide = () => { cur = null; tt.classList.remove("on"); };
  for (const s of auditShields(null)) {
    const lab = h("span", { class: "alab" }, s.label), mk = h("span", { class: "amk" }, s.mark);
    const c = h("span", { class: `achip ${s.level}`, "data-k": s.key, role: "listitem", tabindex: 0, "aria-label": `${s.label}: ${s.tip}`, html: SHIELD });
    c.append(lab, mk);
    c.addEventListener("pointerenter", () => show(c)); c.addEventListener("pointerleave", hide);
    c.addEventListener("focus", () => show(c)); c.addEventListener("blur", hide);
    chips.set(s.key, { chip: c, lab, mk, tip: s.tip }); row.append(c);
  }
  const el = h("section", { class: "audit", "data-testid": "hb-ca-audit", "aria-label": "Token audit" }, row);
  return {
    el,
    set(a) {
      if (!a) { el.hidden = true; hide(); return; }
      el.hidden = false;
      for (const s of auditShields(a)) {
        const c = chips.get(s.key)!;
        if (c.lab.textContent !== s.label) c.lab.textContent = s.label;
        if (c.mk.textContent !== s.mark) c.mk.textContent = s.mark;
        c.chip.className = `achip ${s.level}`; c.tip = s.tip;
        // the popup shows the shields only: the label and the result stay readable for screen readers
        c.chip.setAttribute("aria-label", `${s.label}: ${s.tip}`);
        if (cur === c.chip) show(c.chip);
      }
    },
  };
}
