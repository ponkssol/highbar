/** The CA popup's live position line (under the chart): the selected wallet's holding of the token, its value in SOL, average buy,
 *  SOL invested and unrealized PnL. The balance and the cost basis come from the worker (ca:position: chain balance plus the
 *  extension's own trade ledger); the price is the popup's live price, so the card adds no polling of its own. Hidden when the
 *  wallet holds none. Bought elsewhere (the ledger does not explain the balance): value only and "PnL —". */
import { h } from "./dom";
import { tweenText } from "./tween";
import { pnl } from "../lib/ledger";
import { compactNum, compactPct, compactSol, tinySol } from "../lib/compact";
import type { CaPosition } from "../lib/messages";

const unit = (f: (n: number | null, signed?: boolean) => string, signed = false) => (n: number | null) => (n === null || !Number.isFinite(n) ? "—" : `${f(n, signed)} SOL`);
const sol = unit(compactSol), signedSol = unit(compactSol, true);
const pct = compactPct, qty = (n: number | null) => compactNum(n);
const tiny = tinySol;

export function pnlCard(sym: () => string): { el: HTMLElement; set(p: CaPosition | null): void; price(usd: number | null): void } {
  // one line: amount $SYM · value SOL · PnL SOL (PnL %); average buy and SOL invested in the tooltip (and the aria label)
  const amtEl = h("span", { class: "pv", "data-k": "amt" }), symEl = h("span", { class: "psym" });
  const valEl = h("span", { class: "pv big", "data-k": "value" });
  const pnlEl = h("span", { class: "pv", "data-k": "pnl" }), pctEl = h("span", { class: "ppct", "data-k": "pnlpct" });
  const pnlBox = h("span", { class: "pnlc" }, pnlEl, pctEl);
  const dot = () => h("i", { class: "pdot", "aria-hidden": "true" }, "·");
  const el = h("div", { class: "pnl", hidden: true, role: "group", "data-testid": "hb-ca-pnl" },
    h("span", { class: "pline" }, amtEl, symEl), dot(), valEl, dot(), pnlBox);
  const pnlNum = (n: number | null) => (n === null || !Number.isFinite(n) ? "PnL —" : compactSol(n, true));
  const pctNum = (n: number | null) => (n === null || !Number.isFinite(n) ? "" : `(${pct(n)})`);
  let pos: CaPosition | null = null, usd: number | null = null;
  const draw = () => {
    let raw = 0n;
    try { raw = pos ? BigInt(pos.balanceRaw) : 0n; } catch { raw = 0n; }
    if (!pos || raw <= 0n) { if (!el.hidden) el.hidden = true; return; }
    const priceSol = usd !== null && pos.solUsd ? usd / pos.solUsd : null;
    const r = pnl(raw, pos.decimals, priceSol, pos.entries);
    const s = `$${sym()}`; if (symEl.textContent !== s) symEl.textContent = s;
    const n = Number(raw) / 10 ** pos.decimals;
    tweenText(amtEl, n, qty);
    tweenText(valEl, r.valueSol, sol);
    tweenText(pnlEl, r.pnlSol, pnlNum);
    tweenText(pctEl, r.pnlPct, pctNum);
    const cls = `pnlc ${r.pnlSol === null ? "na" : r.pnlSol > 0 ? "up" : r.pnlSol < 0 ? "dn" : ""}`;
    if (pnlBox.className !== cls) pnlBox.className = cls;
    const tip = `Holding ${qty(n)} ${s}\nValue ${sol(r.valueSol)}\nAvg buy ${tiny(r.avgSol)}\nInvested ${sol(r.investedSol)}\nUnrealized PnL ${signedSol(r.pnlSol)}${r.pnlPct === null ? "" : ` (${pct(r.pnlPct)})`}`;
    if (el.title !== tip) { el.title = tip; el.setAttribute("aria-label", tip.replace(/\n/g, ", ")); }
    el.toggleAttribute("data-basis", r.pnlSol !== null || r.investedSol !== null);
    if (el.hidden) el.hidden = false;
  };
  return { el, set(p) { pos = p; draw(); }, price(v) { if (v !== usd) { usd = v; if (pos) draw(); } } };
}
