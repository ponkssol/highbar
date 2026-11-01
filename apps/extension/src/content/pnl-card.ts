/** The CA popup's live PnL card (above the chart): the selected wallet's holding of the token, its value in SOL, average buy,
 *  SOL invested and unrealized PnL. The balance and the cost basis come from the worker (ca:position: chain balance plus the
 *  extension's own trade ledger); the price is the popup's live price, so the card adds no polling of its own. Hidden when the
 *  wallet holds none. Bought elsewhere (the ledger does not explain the balance): value only and "PnL —". */
import { h } from "./dom";
import { tweenText } from "./tween";
import { pnl } from "../lib/ledger";
import type { CaPosition } from "../lib/messages";

const sol = (d: number) => (n: number | null) => (n === null || !Number.isFinite(n) ? "—" : `${n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d })} SOL`);
const signedSol = (n: number | null) => (n === null || !Number.isFinite(n) ? "—" : `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} SOL`);
const pct = (n: number | null) => (n === null || !Number.isFinite(n) ? "" : `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n).toFixed(1)}%`);
const qty = (n: number | null) => {
  if (n === null || !Number.isFinite(n)) return "—";
  const a = Math.abs(n), f = (v: number, u: string) => `${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${u}`;
  return a >= 1e9 ? f(n / 1e9, "B") : a >= 1e6 ? f(n / 1e6, "M") : a >= 1e3 ? f(n / 1e3, "K") : f(n, "");
};
/** SOL per token, small numbers as 0.0₆234 */
const tiny = (n: number | null) => {
  if (n === null || !Number.isFinite(n) || n <= 0) return "—";
  if (n >= 0.0001) return `${n.toLocaleString("en-US", { maximumSignificantDigits: 4 })} SOL`;
  const s = n.toFixed(20).replace(/^0\./, ""), z = s.match(/^0*/)?.[0].length ?? 0;
  return `0.0${String(z).split("").map((c) => "₀₁₂₃₄₅₆₇₈₉"[Number(c)]).join("")}${s.slice(z, z + 4).replace(/0+$/, "")} SOL`;
};

export function pnlCard(sym: () => string): { el: HTMLElement; set(p: CaPosition | null): void; price(usd: number | null): void } {
  const amtEl = h("span", { class: "pv", "data-k": "amt" }), symEl = h("span", { class: "psym" });
  const valEl = h("span", { class: "pv big", "data-k": "value" });
  const avgEl = h("span", { class: "pv", "data-k": "avg" }), invEl = h("span", { class: "pv", "data-k": "invested" });
  const pnlEl = h("span", { class: "pv", "data-k": "pnl" }), pctEl = h("span", { class: "ppct", "data-k": "pnlpct" });
  const pnlBox = h("div", { class: "pcell pnlc" }, h("span", { class: "pk" }, "Unrealized PnL"), h("span", { class: "pline" }, pnlEl, pctEl));
  const el = h("div", { class: "pnl", hidden: true, "data-testid": "hb-ca-pnl" },
    h("div", { class: "ptop" }, h("div", { class: "pcell" }, h("span", { class: "pk" }, "Holding"), h("span", { class: "pline" }, amtEl, symEl)),
      h("div", { class: "pcell r" }, h("span", { class: "pk" }, "Value"), valEl)),
    h("div", { class: "pgrid" }, h("div", { class: "pcell" }, h("span", { class: "pk" }, "Avg buy"), avgEl), h("div", { class: "pcell" }, h("span", { class: "pk" }, "Invested"), invEl), pnlBox));
  let pos: CaPosition | null = null, usd: number | null = null;
  const draw = () => {
    let raw = 0n;
    try { raw = pos ? BigInt(pos.balanceRaw) : 0n; } catch { raw = 0n; }
    if (!pos || raw <= 0n) { if (!el.hidden) el.hidden = true; return; }
    const priceSol = usd !== null && pos.solUsd ? usd / pos.solUsd : null;
    const r = pnl(raw, pos.decimals, priceSol, pos.entries);
    const s = `$${sym()}`; if (symEl.textContent !== s) symEl.textContent = s;
    tweenText(amtEl, Number(raw) / 10 ** pos.decimals, qty);
    tweenText(valEl, r.valueSol, sol(3));
    tweenText(avgEl, r.avgSol, tiny);
    tweenText(invEl, r.investedSol, sol(3));
    tweenText(pnlEl, r.pnlSol, signedSol);
    tweenText(pctEl, r.pnlPct, pct);
    const cls = `pcell pnlc ${r.pnlSol === null ? "na" : r.pnlSol > 0 ? "up" : r.pnlSol < 0 ? "dn" : ""}`;
    if (pnlBox.className !== cls) pnlBox.className = cls;
    el.toggleAttribute("data-basis", r.pnlSol !== null || r.investedSol !== null);
    if (el.hidden) el.hidden = false;
  };
  return { el, set(p) { pos = p; draw(); }, price(v) { if (v !== usd) { usd = v; if (pos) draw(); } } };
}
