/** Holding panel: attached to the drawer as one window and lists the tokens the checked wallets created or hold, with a quick sell of
 *  the dev buy. Rows, prices and balances come from the worker. A sell sends only {walletId, mint, pct, slippage} over a
 *  "sell" port: the worker builds, signs with that wallet, simulates and sends. No key or signed tx ever reaches this page. */
import type { HoldingRes, HoldPrefs, SellPortIn, SellPortOut, WalletRow } from "../lib/messages";
import { cleanSlippage, fmtCompact, fmtMcap, fmtPct, fmtSolFit, parsePct, planText, sellAllPlan, SLIPPAGE_DEFAULT, type HoldRow } from "../lib/holding";
import type { SellStep } from "../lib/sell";
import { BUY_MAX_SOL } from "../lib/limits";
import { fmtSol, short } from "../lib/format";
import { CLOSE } from "../lib/icons";
import { ask, h, scrollFade, svg } from "./dom";
import { attachLayout } from "../lib/place";
import { menu } from "./menu";
import { playSfx, primeSfx } from "../lib/sfx";
import type { FeeInfo } from "../lib/feemath";
import { PRIORITY_DEFAULT_SOL } from "../lib/priomath";
import { costsText, extraCosts } from "../lib/costs";
import { toasts } from "./toast";

export const HOLD_ICON = `<svg viewBox="0 0 16 16" width="15" height="15" fill="none" aria-hidden="true" focusable="false"><rect x="2.25" y="2.75" width="11.5" height="10.5" rx="2" stroke="currentColor" stroke-width="1.3"/><path d="M5 10.5V8.5M8 10.5V5.5M11 10.5V7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`;
const REFRESH = `<svg viewBox="0 0 16 16" width="13" height="13" fill="none" aria-hidden="true" focusable="false"><path d="M13 8a5 5 0 1 1-1.46-3.54" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><path d="M13 2.75V5.5h-2.75" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const OPEN = `<svg viewBox="0 0 16 16" width="11" height="11" fill="none" aria-hidden="true" focusable="false"><path d="M6.5 3.25H4A1.25 1.25 0 0 0 2.75 4.5v7.5c0 .69.56 1.25 1.25 1.25h7.5c.69 0 1.25-.56 1.25-1.25V9.5M9 2.75h4.25V7M13 3 7.5 8.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

type Side = "buy" | "sell";
const STEP_TEXT: Record<SellStep, string> = { build: "Building the", sign: "Signing in the extension", simulate: "Simulating", send: "Sending", confirm: "Confirming on Solana" };
const stepText = (side: Side, x: SellStep) => (x === "build" ? `${STEP_TEXT.build} ${side}` : STEP_TEXT[x]);
export const BUY_CHIPS = [0.1, 0.5, 1] as const;
/** A SOL amount for a buy: above 0, at most BUY_MAX_SOL, up to 4 decimals (a comma works as the decimal mark). */
export function parseBuySol(v: string): number | null {
  const t = v.trim().replace(",", ".");
  if (!/^\d{0,4}(\.\d{0,4})?$/.test(t) || t === "" || t === ".") return null;
  const n = Number(t);
  return Number.isFinite(n) && n > 0 && n <= BUY_MAX_SOL ? n : null;
}
/** amt is the percent for a sell and the SOL for a buy. */
type RowState =
  | { kind: "idle"; custom: string }
  | { kind: "confirm"; side: Side; amt: number; custom: string }
  | { kind: "run"; side: Side; amt: number; step: SellStep }
  | { kind: "done"; side: Side; amt: number; url: string }
  | { kind: "error"; side: Side; amt: number; error: string; title: string };
const amtText = (side: Side, amt: number) => (side === "buy" ? `${fmtSol(amt)} SOL` : `${amt}%`);

export interface HoldingPanel {
  btn: HTMLElement;
  /** The panel header, a second drag handle for the combined window. */
  head: HTMLElement;
  /** Width the open panel adds left and right of the drawer, so the drawer placement keeps the whole window on screen. */
  extent(): { l: number; r: number };
  /** Close the wallet filter list if it is open (the drawer Esc closes that first). */
  closePop(): boolean;
  sync(): void; walletsChanged(): void; destroy(): void;
}

export function holdingPanel(root: ShadowRoot, drawer: HTMLElement, checked: () => WalletRow[]): HoldingPanel {
  let feeI: (FeeInfo & { prioritySol: number }) | null = null;
  let open = false, prefs: HoldPrefs = { open: false, filter: null, slippagePct: SLIPPAGE_DEFAULT };
  let data: HoldingRes | null = null, loading = false, loadErr = "", timer: ReturnType<typeof setTimeout> | null = null, gen = 0;
  const st = new Map<string, RowState>();
  const sides = new Map<string, Side>();
  const ports = new Set<chrome.runtime.Port>();

  const btn = h("button", { class: "hbtn", type: "button", "aria-pressed": "false", "aria-label": "Holding", title: "Holding", html: HOLD_ICON, "data-testid": "hb-holding-toggle" });
  const fm = menu(root, { label: "Wallets", testid: "hb-holding-filter", onChange: (v) => { prefs.filter = v || null; void ask({ type: "holding:prefs:set", filter: prefs.filter }).catch(() => {}); data = null; draw(); void load(false); } });
  const filter = fm.btn;
  const slip = h("input", { type: "text", inputmode: "decimal", class: "hslip", "aria-label": "Slippage percent", "data-testid": "hb-holding-slippage" });
  const refreshBtn = h("button", { class: "x", type: "button", "aria-label": "Refresh", title: "Refresh", html: REFRESH, "data-testid": "hb-holding-refresh" });
  const count = h("span", { class: "hcount", "data-testid": "hb-holding-count" });
  const note = h("div", { class: "hnote", hidden: true, "data-testid": "hb-holding-note" });
  // Sell All: 100% of every held token in the listed wallets, after a confirm strip (counts, costs) under the toolbar
  const allBtn = h("button", { class: "hb hall", type: "button", title: "Sell 100% of every held token in these wallets", "data-testid": "hb-holding-sell-all" }, "Sell All") as HTMLButtonElement;
  const allBar = h("div", { class: "hallbar", hidden: true, role: "alertdialog", "aria-label": "Confirm Sell All", "data-testid": "hb-sell-all-confirm" });
  let allRunning = false;
  const list = scrollFade(h("div", { class: "hlist", "data-testid": "hb-holding-list" }));
  const updated = h("span", { class: "hupd" });
  const panel = h("aside", { class: "hpanel", hidden: true, role: "region", "aria-label": "Holding", "data-testid": "hb-holding" },
    h("header", { class: "hhead", title: "Drag to move, double click to reset", "data-testid": "hb-holding-head" }, svg(HOLD_ICON), h("h3", {}, "Holding"), count, h("span", { style: "flex:1" }), refreshBtn,
      h("button", { class: "x", type: "button", "aria-label": "Close holding", onclick: () => setOpen(false), html: CLOSE })),
    h("div", { class: "htool" }, filter, h("label", { class: "hslipw", title: "Max slippage for sells" }, h("span", {}, "Slippage"), slip, h("span", { class: "hunit" }, "%")), allBtn),
    allBar, note,
    h("div", { class: "hcols" }, h("span", {}, "Token"), h("span", {}, "Bought"), h("span", {}, "UPnL"), h("span", {}, "Bal")),
    list,
    h("footer", { class: "hfoot" }, updated));
  root.append(panel, fm.pop);
  // One shadow and outline for the drawer and the panel together: a frame behind both (same layer, earlier in the tree)
  const frame = h("div", { class: "hframe", hidden: true, "aria-hidden": "true" });
  root.insertBefore(frame, drawer);
  const head = panel.querySelector("header") as HTMLElement;
  for (const ev of ["keydown", "keyup", "keypress"]) panel.addEventListener(ev, (e) => e.stopPropagation()); // x.com hotkeys stay out

  // ---- attached: one window with the drawer, same top, height and header row ----
  const vw = () => document.documentElement.clientWidth || innerWidth;
  const layout = () => attachLayout(drawer.offsetWidth, vw());
  const detach = () => { drawer.classList.remove("att-r", "att-l"); panel.classList.remove("att-r", "att-l"); frame.hidden = true; };
  const sync = () => {
    if (!open) return detach();
    // Layout box, not getBoundingClientRect: the drawer's open animation translates it, and the panel should not copy that
    const l0 = parseFloat(drawer.style.left), t0 = parseFloat(drawer.style.top);
    const r = { left: Number.isFinite(l0) ? l0 : drawer.offsetLeft, top: Number.isFinite(t0) ? t0 : drawer.offsetTop, width: drawer.offsetWidth, height: drawer.offsetHeight, right: 0 };
    r.right = r.left + r.width;
    const d = attachLayout(r.width, vw());
    const left = d.side === "right" ? r.right : r.left - d.w;
    const top = Math.round(r.top), height = Math.round(r.height);
    drawer.classList.toggle("att-r", d.side === "right"); drawer.classList.toggle("att-l", d.side === "left");
    panel.classList.toggle("att-r", d.side === "right"); panel.classList.toggle("att-l", d.side === "left");
    Object.assign(panel.style, { left: `${Math.round(left)}px`, top: `${top}px`, height: `${height}px`, width: `${d.w}px` });
    const dh = drawer.querySelector("header"); if (dh) head.style.height = `${dh.offsetHeight}px`;
    frame.hidden = false;
    Object.assign(frame.style, { left: `${Math.round(Math.min(left, r.left))}px`, top: `${top}px`, height: `${height}px`, width: `${Math.round(r.width + d.w)}px` });
    panel.dataset.side = d.side;
    panel.classList.toggle("narrow", d.w < 300); // the leftover width on a narrow screen: the market cap keeps its room, the ticker goes
  };
  const ro = new ResizeObserver(sync); ro.observe(drawer);
  addEventListener("resize", sync);

  // ---- wallets and prefs ----
  const ids = () => { const c = checked(); return prefs.filter && c.some((w) => w.id === prefs.filter) ? [prefs.filter] : c.map((w) => w.id); };
  const drawFilter = () => {
    const c = checked(), cur = prefs.filter && c.some((w) => w.id === prefs.filter) ? prefs.filter : "";
    fm.set([{ value: "", label: c.length > 1 ? `All checked (${c.length})` : c[0] ? c[0].label : "Wallet", sub: c.length === 1 ? short(c[0].address, 4) : undefined, title: c.length === 1 ? c[0].address : undefined },
      ...(c.length > 1 ? c.map((w) => ({ value: w.id, label: w.label, sub: short(w.address, 4), title: w.address })) : [])], cur);
  };
  const commitSlip = () => {
    const v = cleanSlippage(Number((slip as HTMLInputElement).value.replace(",", ".")));
    prefs.slippagePct = v; (slip as HTMLInputElement).value = String(v);
    void ask({ type: "holding:prefs:set", slippagePct: v }).catch(() => {});
  };
  slip.addEventListener("change", commitSlip);
  slip.addEventListener("keydown", (e) => { if ((e as KeyboardEvent).key === "Enter") { commitSlip(); (slip as HTMLInputElement).blur(); } });
  refreshBtn.addEventListener("click", () => void load(true));

  // ---- data ----
  async function load(fresh: boolean) {
    if (!open) return;
    const my = ++gen;
    loading = true; refreshBtn.classList.add("spin");
    try {
      const res = await ask({ type: "holding", walletIds: ids(), fresh });
      if (my !== gen || !open) return;
      data = res; loadErr = "";
    } catch (e) { if (my === gen) loadErr = (e as Error).message; }
    finally { if (my === gen) { loading = false; refreshBtn.classList.remove("spin"); draw(); schedule(); } }
  }
  function schedule() {
    if (timer) clearTimeout(timer);
    timer = null;
    if (!open) return;
    timer = setTimeout(() => { if (document.hidden) schedule(); else void load(false); }, data?.pollMs ?? 15_000);
  }

  // ---- rows ----
  const typing = () => { const a = root.activeElement; return !!a && panel.contains(a) && a.tagName === "INPUT"; };
  function draw(force = true) {
    if (!force && typing()) return;
    const rows = data?.rows ?? [];
    count.textContent = data ? String(rows.length) : "";
    // One small line only when something needs attention (a load error, else a read error). The footer only says when it was updated.
    const line = loadErr || data?.errors[0] || "";
    note.hidden = !line;
    note.textContent = line;
    note.title = line;
    updated.textContent = data ? `Updated ${new Date(data.updatedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" })}` : "";
    const can = sellAllPlan(rows, busy).rows.length > 0;
    allBtn.disabled = allRunning || !can;
    if (!can && !allRunning) allBar.hidden = true;
    if (!data) { list.replaceChildren(h("div", { class: "hempty" }, loading ? "Loading…" : loadErr || "Loading…")); return; }
    if (!rows.length) { list.replaceChildren(h("div", { class: "hempty", "data-testid": "hb-holding-empty" }, h("strong", {}, "No tokens yet"), h("span", {}, "Tokens you launch from these wallets show up here with their market cap and your dev buy."))); return; }
    const multi = new Set(rows.map((r) => r.walletId)).size > 1 || (data.walletIds.length > 1);
    list.replaceChildren(...rows.map((r) => rowEl(r, multi)));
  }

  function rowEl(r: HoldRow, multi: boolean): HTMLElement {
    const s = st.get(r.key) ?? { kind: "idle", custom: "" };
    const tone = (n: number | null) => (n == null || n === 0 ? "" : n > 0 ? " up" : " down");
    // The worker sends data URLs only. A broken one (or none) falls back to the first letter on a dark circle.
    const ph = () => h("span", { class: "hph", "aria-hidden": "true" }, (r.symbol || r.name || "?").slice(0, 1).toUpperCase());
    const img = r.image && r.image.startsWith("data:image/") ? h("img", { src: r.image, alt: "", loading: "lazy" }) : ph();
    if (img.tagName === "IMG") img.addEventListener("error", () => { img.replaceWith(ph()); }, { once: true });
    const token = h("a", { class: "htok", href: r.tokenUrl, target: "_blank", rel: "noopener noreferrer", title: `Open ${r.name} ($${r.symbol}) on highbar` },
      h("span", { class: "himg" }, img),
      // the name (often a whole tweet line) stays out of the row; it is in the tooltip
      h("span", { class: "htxt" },
        h("span", { class: "hname" }, h("span", { class: "hn htick" }, `$${r.symbol}`), svg(OPEN)),
        h("span", { class: "hsub" }, h("span", { class: "hmc", title: "Market cap" }, `MC ${fmtMcap(r)}`))));
    const chips = h("div", { class: "hchips" },
      multi ? h("span", { class: "hchip", title: r.walletAddress }, r.walletLabel) : null,
      r.migrated ? h("span", { class: "hchip mig", title: "Migrated, trading on Meteora DAMM v2" }, "Migrated") : null,
      r.created ? null : h("span", { class: "hchip", title: "Held, not launched from this wallet" }, "Held"));
    const grid = h("div", { class: "hgrid" }, h("div", { class: "hcell tok" }, token),
      h("div", { class: "hcell num" }, h("span", { title: `${fmtSol(r.boughtSol)} SOL` }, fmtSolFit(r.boughtSol)), h("span", { class: "hsm" }, "SOL")),
      h("div", { class: `hcell num${tone(r.pnlSol)}`, "data-testid": "hb-holding-pnl" }, h("span", { title: r.pnlSol == null ? "" : `${r.pnlSol.toLocaleString("en-US", { maximumFractionDigits: 6 })} SOL` }, fmtSolFit(r.pnlSol, true)), h("span", { class: "hsm" }, fmtPct(r.pnlPct))),
      h("div", { class: "hcell num" }, h("span", { title: `${r.amount.toLocaleString("en-US")} ${r.symbol}` }, fmtCompact(r.amount)), h("span", { class: "hsm", title: r.valueSol == null ? "" : `${fmtSol(r.valueSol)} SOL` }, r.valueSol == null ? "–" : `${fmtSolFit(r.valueSol)} SOL`)));
    // Two lines for the token and numbers, then one action line: the chips sit at its left while idle
    const none = BigInt(r.raw || "0") === 0n;
    return h("div", { class: `hrow${s.kind !== "idle" ? ` ${s.kind}` : ""}${none ? " none" : ""}`, "data-testid": "hb-holding-row", "data-key": r.key }, grid, sellBar(r, s, chips, multi));
  }

  function setRow(key: string, s: RowState) { st.set(key, s); draw(); }

  function sellBar(r: HoldRow, s: RowState, chips: HTMLElement, multi: boolean): HTMLElement {
    const held = BigInt(r.raw || "0") > 0n;
    if (s.kind === "confirm") {
      const est = r.valueSol == null ? null : r.valueSol * s.amt / 100;
      // before signing: the extra cost (priority fee + the highbar fee on the SOL in, or on the minimum SOL out, estimated)
      const basis = s.side === "buy" ? BigInt(Math.round(s.amt * 1e9)) : est == null ? null : BigInt(Math.floor(est * (1 - prefs.slippagePct / 100) * 1e9));
      const extra = costsText(extraCosts(feeI?.prioritySol ?? PRIORITY_DEFAULT_SOL, feeI, basis));
      const what = s.side === "buy" ? `Buy ${r.symbol} for ${fmtSol(s.amt)} SOL` : `Sell ${s.amt}% of ${r.symbol}${est != null ? ` for about ${fmtSol(est)} SOL` : ""}`;
      return h("div", { class: `hsell confirm ${s.side}`, "data-testid": "hb-sell-confirm" },
        h("span", { class: "hmsg", title: what }, h("span", { class: "hl1" }, what), h("span", { class: "hsm", title: extra, "data-testid": "hb-sell-costs" }, `Max slippage ${prefs.slippagePct}%${multi ? `, ${s.side === "buy" ? "with" : "from"} ${r.walletLabel}` : ""} · ${extra}`)),
        h("button", { class: "hb ghost", type: "button", onclick: () => setRow(r.key, { kind: "idle", custom: s.custom }) }, "Cancel"),
        h("button", { class: `hb ${s.side}`, type: "button", "data-testid": "hb-sell-go", onclick: () => runTrade(r, s.side, s.amt) }, "Confirm"));
    }
    if (s.kind === "run") {
      return h("div", { class: "hsell run", role: "status", "data-testid": "hb-sell-progress" }, h("span", { class: "hspin" }), h("span", { class: "hmsg" }, h("span", { class: "hl1" }, `${stepText(s.side, s.step)}…`)), h("span", { class: "hsm" }, amtText(s.side, s.amt)));
    }
    if (s.kind === "done") {
      const what = `${s.side === "buy" ? "Buy" : "Sell"} success`, tip = s.side === "buy" ? `Bought ${r.symbol} for ${fmtSol(s.amt)} SOL` : `Sold ${s.amt}% of ${r.symbol}`;
      return h("div", { class: "hsell done", role: "status", "data-testid": "hb-sell-done" }, h("span", { class: "hmsg", title: tip }, h("span", { class: "hl1" }, `${what} ·`)),
        h("a", { class: "hlink", href: s.url, target: "_blank", rel: "noopener noreferrer", "data-testid": "hb-sell-solscan" }, "View tx", svg(OPEN)),
        h("button", { class: "hb ghost", type: "button", onclick: () => setRow(r.key, { kind: "idle", custom: "" }) }, "OK"));
    }
    if (s.kind === "error") {
      return h("div", { class: "hsell err", role: "alert", "data-testid": "hb-sell-error" }, h("span", { class: "hmsg", title: s.title }, h("span", { class: "hl1" }, s.error)),
        h("button", { class: "hb ghost", type: "button", onclick: () => setRow(r.key, { kind: "idle", custom: "" }) }, "OK"));
    }
    const side: Side = sides.get(r.key) ?? "sell";
    const toggle = h("span", { class: "hside", role: "group", "aria-label": "Buy or sell", "data-testid": "hb-trade-side" },
      ...(["buy", "sell"] as const).map((x) => h("button", { class: `hsd ${x}${x === side ? " on" : ""}`, type: "button", "aria-pressed": String(x === side), "data-testid": `hb-side-${x}`,
        onclick: () => { if (x === side) return; sides.set(r.key, x); setRow(r.key, { kind: "idle", custom: "" }); } }, x === "buy" ? "Buy" : "Sell")));
    const can = side === "buy" || held;
    const parse = (v: string) => (side === "buy" ? parseBuySol(v) : parsePct(v));
    const pick = (amt: number) => { if (can) { setRow(r.key, { kind: "confirm", side, amt, custom: s.custom }); void ask({ type: "fee:info" }).then((f) => { feeI = f; draw(); }).catch(() => {}); } };
    const custom = h("input", { type: "text", inputmode: "decimal", class: "hpct", placeholder: side === "buy" ? "SOL" : "%", value: s.custom,
      "aria-label": side === "buy" ? "Custom SOL amount" : "Custom percent", disabled: !can, "data-testid": "hb-sell-custom" }) as HTMLInputElement;
    const go = h("button", { class: `hb ${can ? side : "off"}`, type: "button", disabled: true, "data-testid": "hb-sell-custom-go" }, side === "buy" ? "Buy" : "Sell") as HTMLButtonElement;
    const check = () => { const p = parse(custom.value); go.disabled = !can || p === null; custom.classList.toggle("bad", custom.value !== "" && p === null); };
    custom.addEventListener("input", () => { st.set(r.key, { kind: "idle", custom: custom.value }); check(); });
    custom.addEventListener("keydown", (e) => { if ((e as KeyboardEvent).key === "Enter" && !go.disabled) go.click(); });
    go.addEventListener("click", () => { const p = parse(custom.value); if (p !== null) pick(p); });
    check();
    const quick = side === "buy"
      ? h("span", { class: "hpg buy", role: "group", "aria-label": "Buy with SOL" }, ...BUY_CHIPS.map((v) => h("button", { class: "hb pct", type: "button", title: `Buy with ${v} SOL`, "data-testid": `hb-buy-${v}`, onclick: () => pick(v) }, String(v))))
      : h("span", { class: "hpg", role: "group", "aria-label": "Sell percent", title: "Sell percent" }, ...[25, 50, 100].map((p) => h("button", { class: "hb pct", type: "button", disabled: !held, title: p === 100 ? "Sell all" : `Sell ${p}%`, "aria-label": p === 100 ? "Sell all" : `Sell ${p}%`, "data-testid": `hb-sell-${p}`, onclick: () => pick(p) }, p === 100 ? "All" : String(p))));
    if (!held && side === "sell") chips.append(h("span", { class: "hnone", title: "This wallet holds none of this token. Switch to Buy to buy some." }, "Nothing left to sell"));
    return h("div", { class: `hsell idle ${side}`, "data-testid": "hb-sell-bar" }, chips, h("span", { class: "hact" }, toggle, quick, h("span", { class: "hpctw" }, custom), go));
  }

  function runTrade(r: HoldRow, side: Side, amt: number, bulk = false): Promise<boolean> {
    primeSfx();
    let settle: (ok: boolean) => void = () => {};
    const out = new Promise<boolean>((res) => { settle = res; });
    const tell = (ok: boolean, text: string, href?: string) => { if (bulk) toasts().show(ok ? "ok" : "err", text, href); };
    setRow(r.key, { kind: "run", side, amt, step: "build" });
    const port = chrome.runtime.connect({ name: "sell" });
    ports.add(port);
    const end = () => { ports.delete(port); try { port.disconnect(); } catch { /* gone */ } };
    const fail = (error: string) => { setRow(r.key, { kind: "error", side, amt, error, title: error }); tell(false, `Sell $${r.symbol} failed: ${error}`); settle(false); };
    let sent = false;
    port.onMessage.addListener((m: SellPortOut) => {
      if (m.type === "step") { if (!sent) setRow(r.key, { kind: "run", side, amt, step: m.step }); }
      // fast mode: shown as done the moment it is sent; the confirmation follows (a failure replaces it with the error)
      else if (m.type === "sent") { sent = true; setRow(r.key, { kind: "done", side, amt, url: m.solscanUrl }); if (!bulk) playSfx("ok"); tell(true, `Sell $${r.symbol} sent`, m.solscanUrl); settle(true); }
      else if (m.type === "done") { if (!sent) { setRow(r.key, { kind: "done", side, amt, url: m.solscanUrl }); if (!bulk) playSfx("ok"); tell(true, `Sold $${r.symbol}`, m.solscanUrl); settle(true); } end(); if (!bulk) void load(true); }
      else if (m.type === "error") { fail(m.error); if (!bulk) playSfx("err"); end(); }
    });
    port.onDisconnect.addListener(() => { ports.delete(port); const cur = st.get(r.key); if (cur?.kind === "run") fail("The extension stopped answering. Check Solscan before you try again."); });
    const msg: SellPortIn = side === "buy"
      ? { type: "sell", side: "buy", sol: amt, pct: 0, walletId: r.walletId, mint: r.mint, slippagePct: prefs.slippagePct }
      : { type: "sell", side: "sell", walletId: r.walletId, mint: r.mint, pct: amt, slippagePct: prefs.slippagePct };
    port.postMessage(msg);
    return out;
  }

  const busy = (k: string) => { const x = st.get(k)?.kind; return x === "run" || x === "confirm"; };
  allBtn.addEventListener("click", () => {
    const p = sellAllPlan(data?.rows ?? [], busy);
    if (!p.rows.length) return;
    void ask({ type: "fee:info" }).then((f) => { feeI = f; drawAll(); }).catch(() => {});
    drawAll();
  });
  function drawAll() {
    const p = sellAllPlan(data?.rows ?? [], busy);
    if (!p.rows.length) { allBar.hidden = true; return; }
    const prio = feeI?.prioritySol ?? PRIORITY_DEFAULT_SOL, fee = feeI?.enabled && feeI.bps ? ` · highbar fee ${feeI.bps / 100}%` : "";
    allBar.replaceChildren(
      h("span", { class: "hmsg" }, h("span", { class: "hl1" }, `Sell 100% of ${planText(p)}?`),
        h("span", { class: "hsm", "data-testid": "hb-sell-all-costs" }, `${p.rows.length} sell${p.rows.length === 1 ? "" : "s"} · Prio ${fmtSol(prio)} SOL each${fee} · Max slippage ${prefs.slippagePct}%`)),
      h("button", { class: "hb ghost", type: "button", onclick: () => { allBar.hidden = true; } }, "Cancel"),
      h("button", { class: "hb sell", type: "button", "data-testid": "hb-sell-all-go", onclick: () => void sellAll() }, "Confirm"));
    allBar.hidden = false;
  }
  async function sellAll() {
    const p = sellAllPlan(data?.rows ?? [], busy);
    allBar.hidden = true;
    if (!p.rows.length || allRunning) return;
    allRunning = true; draw();
    // three at a time: each sell has its own port and wallet signature in the worker (normal fee and priority fee)
    const q = [...p.rows]; let ok = 0, bad = 0;
    const lane = async () => { for (let r = q.shift(); r; r = q.shift()) (await runTrade(r, "sell", 100, true)) ? ok++ : bad++; };
    await Promise.all([lane(), lane(), lane()]);
    allRunning = false;
    playSfx(bad ? "err" : "ok");
    if (p.rows.length > 1) toasts().show(bad ? "err" : "ok", `Sell All: ${ok} sent${bad ? `, ${bad} failed` : ""}`);
    void load(true);
  }

  // ---- open / close ----
  function setOpen(v: boolean, save = true) {
    open = v;
    panel.hidden = !v; btn.setAttribute("aria-pressed", String(v)); btn.classList.toggle("on", v);
    if (save) void ask({ type: "holding:prefs:set", open: v }).catch(() => {});
    if (v) { drawFilter(); (slip as HTMLInputElement).value = String(prefs.slippagePct); sync(); draw(); void load(false); }
    else { gen++; if (timer) clearTimeout(timer); timer = null; detach(); }
    drawer.dispatchEvent(new Event("hb:layout")); // the drawer placement re-fits the window (shifts left to make room)
  }
  btn.addEventListener("click", () => setOpen(!open));
  void ask({ type: "fee:info" }).then((f) => { feeI = f; }).catch(() => {});
  void ask({ type: "holding:prefs:get" }).then((p) => { prefs = p; if (p.open && drawer.isConnected) setOpen(true, false); }).catch(() => {});

  let lastIds = "";
  return {
    btn, head, sync,
    closePop: () => fm.close(),
    extent() { if (!open) return { l: 0, r: 0 }; const d = layout(); return { l: d.extL, r: d.extR }; },
    /** The drawer's checked wallets changed (or their balances refreshed): reload only when the set changed. */
    walletsChanged() {
      const k = checked().map((w) => w.id).join(",");
      if (k === lastIds) return;
      lastIds = k; if (!open) return;
      drawFilter(); data = null; draw(); void load(false);
    },
    destroy() { open = false; gen++; if (timer) clearTimeout(timer); ro.disconnect(); removeEventListener("resize", sync); for (const p of ports) { try { p.disconnect(); } catch { /* gone */ } } fm.destroy(); panel.remove(); frame.remove(); drawer.classList.remove("att-r", "att-l"); },
  };
}
