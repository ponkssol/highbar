/** The CA popup's collapsible Token Audit card: mint authority, freeze authority ("blacklist"), LP burn, top 10 holders.
 *  Data from the worker's ca:audit (chain data through the configured RPC); the footer names that source. The card is built
 *  once; when the audit fails it hides itself. */
import { h } from "./dom";
import type { TokenAudit } from "../lib/audit";
import { top10Level } from "../lib/audit";

const OK = `<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.6" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M5.2 8.2l1.9 1.9 3.8-4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const BAD = `<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.6" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M5.8 5.8l4.4 4.4M10.2 5.8l-4.4 4.4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`;
const WARN = `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.8l6.4 11.4H1.6z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="M8 6.3v3.2M8 11.4v.1" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`;
const CHEV = `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 10l4-4 4 4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const CHAIN = `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6.6 9.4l2.8-2.8M7 4.6l1-1a2.6 2.6 0 013.7 3.7l-1 1M9 11.4l-1 1a2.6 2.6 0 01-3.7-3.7l1-1" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`;

type Level = "ok" | "warn" | "bad" | "na" | "neutral";
let open = true; // remembered while the page is open

export function auditCard(): { el: HTMLElement; set(a: TokenAudit | null): void } {
  const rows = new Map<string, { val: HTMLElement; ic: HTMLElement; row: HTMLElement }>();
  const list = h("div", { class: "arows" });
  const row = (key: string, label: string, tip: string) => {
    const val = h("span", { class: "aval" }, "—"), ic = h("span", { class: "aic na" });
    const r = h("div", { class: "arow", "data-k": key, title: tip }, h("span", { class: "alab" }, label), h("span", { class: "aend" }, val, ic));
    rows.set(key, { val, ic, row: r }); list.append(r);
  };
  row("mint", "NoMint", "Mint authority revoked: nobody can mint more of this token");
  row("freeze", "No Blacklist", "Freeze authority revoked: no holder's account can be frozen");
  row("lp", "Burnt", "Pool LP tokens burnt");
  row("top10", "Top 10", "Share of supply in the 10 largest token accounts (pools and the bonding curve included)");
  const src = h("span", { class: "asrc" }, h("span", { class: "aic2", html: CHAIN }), "On-chain");
  const head = h("button", { type: "button", class: "ahead", "aria-expanded": String(open) }, h("span", {}, "Token Audit"), h("span", { class: "chev", html: CHEV }));
  const el = h("section", { class: `audit${open ? "" : " shut"}`, "data-testid": "hb-ca-audit", "aria-label": "Token audit" }, head, h("div", { class: "abody" }, list, h("div", { class: "afoot" }, src)));
  head.addEventListener("click", () => { open = !open; el.classList.toggle("shut", !open); head.setAttribute("aria-expanded", String(open)); });
  const put = (key: string, text: string, lvl: Level, tip?: string) => {
    const r = rows.get(key)!;
    if (r.val.textContent !== text) r.val.textContent = text;
    r.ic.className = `aic ${lvl}`;
    r.ic.innerHTML = lvl === "ok" ? OK : lvl === "bad" ? BAD : lvl === "warn" ? WARN : "";
    if (tip) r.row.title = tip;
  };
  return {
    el,
    set(a) {
      if (!a) { el.hidden = true; return; }
      el.hidden = false;
      put("mint", a.noMint === null ? "—" : "", a.noMint === null ? "na" : a.noMint ? "ok" : "bad", a.noMint === false ? "Mint authority is still set: more tokens can be minted" : undefined);
      put("freeze", a.noFreeze === null ? "—" : "", a.noFreeze === null ? "na" : a.noFreeze ? "ok" : "bad", a.noFreeze === false ? "Freeze authority is still set: holders' accounts can be frozen" : undefined);
      if (a.lp === "curve") put("lp", "Bonding curve", "neutral", "Still on its bonding curve: there is no LP to burn yet");
      else if (a.lp === "burnt") put("lp", "", "ok", `${a.lpBurntPct ?? 100}% of the pool's LP tokens are burnt`);
      else if (a.lp === "partial") put("lp", `${Math.round(a.lpBurntPct ?? 0)}%`, "warn", `Only ${a.lpBurntPct ?? 0}% of the pool's LP tokens are burnt`);
      else put("lp", "—", "na", "LP burn could not be checked for this pool");
      const t = a.top10Pct, lv = top10Level(t);
      put("top10", t === null ? "—" : `${t < 10 ? t.toFixed(1) : Math.round(t)}%`, lv ?? "na", t === null ? "Top holders are not available from this RPC yet" : undefined);
      src.title = a.source === "onchain" ? "Read from Solana (mint account, largest accounts, pool) through your RPC" : "";
    },
  };
}
