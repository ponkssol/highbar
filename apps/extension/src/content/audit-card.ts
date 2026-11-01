/** The CA popup's Token Audit strip: one row of four small chips (mint authority, freeze authority = "blacklist", LP burn,
 *  top 10 holders), green when the check passes, amber or red when it does not, grey while unknown. The details and the data
 *  source (the worker's ca:audit: chain data through the configured RPC) are in the tooltips. Built once, updated in place;
 *  when the audit fails it hides itself. */
import { h } from "./dom";
import type { TokenAudit } from "../lib/audit";
import { top10Level } from "../lib/audit";

type Level = "ok" | "warn" | "bad" | "na" | "neutral";
const MARK: Record<Level, string> = { ok: "✓", bad: "✗", warn: "!", na: "–", neutral: "" };
const SRC = "Read from Solana (mint account, largest accounts, pool) through your RPC";

export function auditCard(): { el: HTMLElement; set(a: TokenAudit | null): void } {
  const chips = new Map<string, { chip: HTMLElement; lab: HTMLElement; mk: HTMLElement }>();
  const row = h("div", { class: "achips" });
  const chip = (key: string, label: string, tip: string) => {
    const lab = h("span", { class: "alab" }, label), mk = h("span", { class: "amk" }, MARK.na);
    const c = h("span", { class: "achip na", "data-k": key, title: `${tip}\n${SRC}`, role: "listitem" }, lab, mk);
    chips.set(key, { chip: c, lab, mk }); row.append(c);
  };
  chip("mint", "NoMint", "Mint authority revoked: nobody can mint more of this token");
  chip("freeze", "No Blacklist", "Freeze authority revoked: no holder's account can be frozen");
  chip("lp", "Burnt", "Pool LP tokens burnt");
  chip("top10", "Top10", "Share of supply in the 10 largest token accounts (pools and the bonding curve included)");
  row.setAttribute("role", "list");
  const el = h("section", { class: "audit", "data-testid": "hb-ca-audit", "aria-label": "Token audit", title: SRC }, row);
  const put = (key: string, label: string, mark: string, lvl: Level, tip?: string) => {
    const c = chips.get(key)!;
    if (c.lab.textContent !== label) c.lab.textContent = label;
    if (c.mk.textContent !== mark) c.mk.textContent = mark;
    c.chip.className = `achip ${lvl}`;
    if (tip) c.chip.title = `${tip}\n${SRC}`;
  };
  const yes = (v: boolean | null): Level => (v === null ? "na" : v ? "ok" : "bad");
  return {
    el,
    set(a) {
      if (!a) { el.hidden = true; return; }
      el.hidden = false;
      put("mint", "NoMint", MARK[yes(a.noMint)], yes(a.noMint), a.noMint === false ? "Mint authority is still set: more tokens can be minted" : a.noMint ? "Mint authority revoked: nobody can mint more of this token" : "Mint authority could not be checked");
      put("freeze", "No Blacklist", MARK[yes(a.noFreeze)], yes(a.noFreeze), a.noFreeze === false ? "Freeze authority is still set: holders' accounts can be frozen" : a.noFreeze ? "Freeze authority revoked: no holder's account can be frozen" : "Freeze authority could not be checked");
      if (a.lp === "curve") put("lp", "Curve", "", "neutral", "Still on its bonding curve: there is no LP to burn yet");
      else if (a.lp === "burnt") put("lp", "Burnt", MARK.ok, "ok", `${a.lpBurntPct ?? 100}% of the pool's LP tokens are burnt`);
      else if (a.lp === "partial") put("lp", `Burnt ${Math.round(a.lpBurntPct ?? 0)}%`, "", "warn", `Only ${a.lpBurntPct ?? 0}% of the pool's LP tokens are burnt`);
      else put("lp", "Burnt", MARK.na, "na", "LP burn could not be checked for this pool");
      const t = a.top10Pct, lv = top10Level(t);
      put("top10", t === null ? "Top10" : `Top10 ${t < 10 ? t.toFixed(1) : Math.round(t)}%`, t === null ? MARK.na : "", lv ?? "na",
        t === null ? "Top holders are not available from this RPC yet" : `${t}% of supply in the 10 largest token accounts (under 30% green, up to 50% amber, above red)`);
    },
  };
}
