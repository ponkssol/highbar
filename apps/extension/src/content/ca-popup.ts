/** The CA popup (price, live stats, chart frame, buy and sell box). Loaded on demand from the content script the first time a
 *  token button is opened (dynamic import of a packaged, web accessible module), so x.com pages that never open a popup do not
 *  parse this code or its CSS. Like the drawer, nothing here sees a key: the worker resolves, fetches, builds, checks, signs,
 *  simulates and sends. */
import type { CaPosition, CaPrefs, HeldToken, HoldingRes, LiveStats, SellPortIn, SellPortOut } from "../lib/messages";
import type { FeeInfo } from "../lib/feemath";
import { PRIORITY_DEFAULT_SOL, PRIORITY_PRESETS_SOL, priorityError, readPrioritySol } from "../lib/priomath";
import { shortOnSol } from "../lib/costs";
import { toasts } from "./toast";
import { fmtChange, fmtUsdCompact, fmtUsdPrice, type CaInfo } from "../lib/ca";
import { CA_SLIPPAGE_PRESETS, cleanCaSlippage } from "../lib/caprefs";
import { DEV_PRESETS_DEFAULT } from "../lib/devpresets";
import { parsePct } from "../lib/holding";
import type { SellStep } from "../lib/sell";
import { BUY_MAX_SOL } from "../lib/limits";
import { fmtSol } from "../lib/format";
import { compactSol } from "../lib/compact";
import { heldTotal } from "../lib/heldsum";
import { CLOSE, GEAR, HB_MARK, METEORA_MARK, SOL_MARK } from "../lib/icons";
import { clampPos, onScreen, placeBeside, type Pos } from "../lib/place";
import { ask, h, scrollFade, svg } from "./dom";
import { stopTweens, tweenText } from "./tween";
import { auditCard } from "./audit-card";
import { pnlCard } from "./pnl-card";
import { pnl } from "../lib/ledger";
import { playSfx, primeSfx } from "../lib/sfx";
import { fmtUsdFixed } from "../lib/tween";
import { CA_CSS, DRAWER_CSS } from "./styles";
import { parseBuySol } from "./holding";
import type { CaKit } from "./ca";

const VERIFIED = `<svg class="vbadge" viewBox="0 0 16 16" aria-label="Verified on Jupiter" role="img"><path fill="currentColor" d="M8 1l1.7 1.3 2.1-.2.7 2 1.8 1.1-.5 2.1.9 1.9-1.6 1.4-.1 2.1-2.1.4L9.6 15 8 13.7 6.4 15l-1.3-1.7-2.1-.4-.1-2.1L1.3 9.4l.9-1.9-.5-2.1 1.8-1.1.7-2 2.1.2z"/><path d="M5.3 8.2l1.8 1.8 3.6-3.7" stroke="#111" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const STEP: Record<SellStep, string> = { build: "Building", sign: "Signing in the extension", simulate: "Simulating", send: "Sending", confirm: "Confirming on Solana" };
const SELL_PCTS = [25, 50, 100] as const;
/** Under the buy/sell button: the same small muted link as the launch drawer's (a.powered), highbar runs on Meteora's pools. */
const builtOn = () => h("a", { class: "powered", href: "https://meteora.ag", target: "_blank", rel: "noopener noreferrer", "data-testid": "hb-ca-built-on" }, "Built on", svg(METEORA_MARK), "Meteora");

export interface PopupOpts { k: CaKit; mint: string; label: string; anchor: DOMRect | null; tweet: DOMRect | null; column?: DOMRect | null;
  savedPos(): Pos | null; setSavedPos(p: Pos | null): void; close(): void }

export function mountPopup(o: PopupOpts): { host: HTMLElement; cleanup(): void } {
    const { k, mint, label, anchor, tweet, column = null } = o;
    k.injectFonts();
    const st = k.status();
    const popHost = h("div", { "data-hb-ca-pop": "" });
    const root = popHost.attachShadow({ mode: "closed" });
    const style = h("style"); style.textContent = DRAWER_CSS + CA_CSS;
    let prefs: CaPrefs = { slippagePct: 1, tab: "buy" };
    let info: CaInfo | null = null, presets: number[] = [...DEV_PRESETS_DEFAULT].filter((v) => v > 0);
    let buySol: number | null = null, sellPct: number | null = null, busy = false;

    const wslot = h("span", { class: "wslot" });
    const gearB = h("button", { class: "gearb", type: "button", "aria-haspopup": "dialog", "aria-expanded": "false", title: "Slippage and priority fee", "data-testid": "hb-ca-slip-btn" });
    // one line header: the token (logo, name, ticker, price, 24h, copy CA) once it loads, the highbar mark before; X on the right
    const hslot = h("div", { class: "hslot" }, svg(HB_MARK), h("h2", {}, "Trade"));
    // narrow windows (the popup and the Holding column do not fit): the column hides behind this toggle and opens over the trade box
    const htog = h("button", { class: "htog", type: "button", hidden: true, "aria-pressed": "false", "aria-label": "Show held tokens", title: "Holding", "data-testid": "hb-ca-held-toggle" }, "Holding");
    const header = h("header", { title: "Drag to move, double click to reset", "data-testid": "hb-ca-head" }, hslot, htog,
      h("button", { class: "x", type: "button", "aria-label": "Close", onclick: () => o.close(), html: CLOSE }));
    const body = scrollFade(h("div", { class: "body" }, h("div", { class: "loading" }, `Loading ${label}…`)));
    const foot = h("footer");
    // held tokens of the first selected wallet, beside the trade box: token, value, PnL and quick sell buttons per row.
    // A row never switches the popup to another token: selling from here keeps the current token open.
    // right of the title: the total PnL of the listed tokens, or the PnL of the row picked in the list
    const hsum = h("span", { class: "hsum", "data-testid": "hb-ca-held-sum", "aria-live": "polite" });
    const railList = scrollFade(h("div", { class: "hlist", role: "list" }));
    const rail = h("aside", { class: "hrail", hidden: true, "aria-label": "Held tokens", "data-testid": "hb-ca-held" }, h("div", { class: "hhead" }, h("span", { class: "httl" }, "Holding"), hsum), railList);
    const pop = h("div", { class: "drawer capop", role: "dialog", "aria-modal": "false", "aria-label": `Trade ${label}`, "data-testid": "hb-ca-pop" }, header,
      h("div", { class: "cagrid" }, h("div", { class: "camain" }, body, foot), rail));
    const grid = pop.querySelector<HTMLElement>(".cagrid")!;
    htog.addEventListener("click", () => { const on = grid.classList.toggle("hon"); htog.setAttribute("aria-pressed", String(on)); htog.setAttribute("aria-label", on ? "Hide held tokens" : "Show held tokens"); });
    root.append(style, pop);
    for (const ev of ["keydown", "keyup", "keypress"]) pop.addEventListener(ev, (e) => e.stopPropagation());
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && popHost.isConnected) { e.stopPropagation(); if (!slipPop.hidden) { slipPop.hidden = true; gearB.setAttribute("aria-expanded", "false"); return; } if (sw?.close()) return; o.close(); } };
    document.addEventListener("keydown", onKey, true);

    // wallets (the drawer's multi select picker and its checked wallets)
    const sw = st?.exists ? k.walletSwitcher(root, st.network, (ws) => { void ask({ type: "drawer:wallets:set", ids: ws.map((w) => w.id) }).catch(() => {}); drawTrade(); loadPos(); loadHeld(); }, "Trade wallets") : null;
    if (sw) { wslot.append(sw.btn); root.append(sw.pop); void Promise.all([ask({ type: "wallets:list" }), ask({ type: "drawer:wallets:get" })]).then(([l, d]) => { sw.set(l, d.ids); drawTrade(); void sw.load(true); loadPos(); loadHeld(); }).catch(() => {}); }
    let heldReq = 0, heldL: HeldToken[] = [], heldPnl = new Map<string, { pnlSol: number | null; pnlPct: number | null }>();
    // the open token's PnL from the local ledger (the PnL card's numbers), for a token bought outside highbar's launches
    let curPnl: { pnlSol: number | null; pnlPct: number | null } | null = null;
    // per mint: a sell running from the rail, or "All" waiting for its second tap
    const railSt = new Map<string, { kind: "run" } | { kind: "arm"; t: ReturnType<typeof setTimeout> }>();
    // the row picked in the list (its PnL shows in the header); picking it again goes back to the total. Never switches the token.
    let selMint: string | null = null;
    const pnlOf = (m: string) => heldPnl.get(m) ?? (m === mint ? curPnl : null);
    function drawSum2() {
      const w = sw?.get()[0], who = w ? w.label : "this wallet";
      const t = selMint ? heldL.find((x) => x.mint === selMint) : null;
      const signed = (n: number) => `${compactSol(n, true)} SOL`;
      const cl = (n: number | null) => (n === null ? "flat" : n > 0 ? "up" : n < 0 ? "dn" : "flat");
      if (t) {
        const sym = t.symbol ? `$${t.symbol}` : `${t.mint.slice(0, 4)}…`, p = pnlOf(t.mint);
        const tag = t.symbol ?? t.mint.slice(0, 4);
        if (p && p.pnlSol !== null) {
          hsum.replaceChildren(h("span", { class: "hsl" }, tag), h("span", { class: `hsv ${cl(p.pnlSol)}` }, compactSol(p.pnlSol, true)), p.pnlPct === null ? "" : h("span", { class: `hsp ${cl(p.pnlPct)}` }, fmtChange(p.pnlPct)));
          hsum.title = `${sym} unrealized PnL: ${signed(p.pnlSol)}${p.pnlPct === null ? "" : ` (${fmtChange(p.pnlPct)})`}\nTap the row again for the total`;
        } else {
          hsum.replaceChildren(h("span", { class: "hsl" }, tag), h("span", { class: "hsv" }, t.valueUsd === null ? "—" : fmtUsdCompact(t.valueUsd)), t.change24h === null ? "" : h("span", { class: `hsp ${cl(t.change24h)}` }, fmtChange(t.change24h)));
          hsum.title = `${sym}: no cost basis known (not bought through highbar), value and 24h change shown\nTap the row again for the total`;
        }
        return;
      }
      const tot = heldTotal(heldL, pnlOf);
      if (!tot) { hsum.replaceChildren(); hsum.title = ""; return; }
      if (tot.kind === "pnl") {
        hsum.replaceChildren(h("span", { class: "hsl" }, "PnL"), h("span", { class: `hsv ${cl(tot.pnlSol)}` }, signed(tot.pnlSol)), tot.pnlPct === null ? "" : h("span", { class: `hsp ${cl(tot.pnlPct)}` }, fmtChange(tot.pnlPct)));
        hsum.title = `Total unrealized PnL of ${who}: ${tot.counted} of ${tot.of} tokens with a known cost basis (bought through highbar). Tokens without one are left out.\nTap a row for that token's PnL`;
      } else {
        hsum.replaceChildren(h("span", { class: "hsl" }, "Value"), h("span", { class: "hsv" }, fmtUsdCompact(tot.usd)));
        hsum.title = `Total value of ${who}'s ${tot.of} tokens. No cost basis is known for them, so there is no PnL.\nTap a row for that token`;
      }
    }
    function loadHeld() {
      const w = sw?.get()[0];
      if (!w) { rail.hidden = htog.hidden = true; return; }
      const id = ++heldReq;
      void ask({ type: "ca:held", walletId: w.id }).then((l) => { if (id === heldReq) { heldL = l; drawHeld(); } }).catch(() => {});
      // PnL from the Holding panel's rows (bought vs value, highbar tokens); other tokens show their 24h change instead
      void ask({ type: "holding", walletIds: [w.id] }).then((r: HoldingRes) => {
        if (id !== heldReq) return;
        heldPnl = new Map(r.rows.filter((x) => x.walletId === w.id).map((x) => [x.mint, { pnlSol: x.pnlSol, pnlPct: x.pnlPct }]));
        drawHeld();
      }).catch(() => {});
    }
    function railSell(t: HeldToken, pct: number, sym: string) {
      const w = sw?.get()[0];
      if (!w || railSt.get(t.mint)?.kind === "run") return;
      primeSfx();
      railSt.set(t.mint, { kind: "run" }); drawHeld();
      const port = chrome.runtime.connect({ name: "sell" });
      let sent = false, over = false;
      const fin = () => { if (over) return; over = true; railSt.delete(t.mint); try { port.disconnect(); } catch { /* gone */ } drawHeld(); loadHeld(); if (t.mint === mint) loadPos(); void sw?.load(true, true); };
      port.onMessage.addListener((m: SellPortOut) => {
        if (m.type === "sent") { sent = true; toasts().show("ok", `Sell ${pct}% ${sym} sent`, m.solscanUrl); playSfx("ok"); railSt.delete(t.mint); drawHeld(); }
        else if (m.type === "done") { if (!sent) { toasts().show("ok", `Sold ${pct}% ${sym}`, m.solscanUrl); playSfx("ok"); } fin(); }
        else if (m.type === "error") { toasts().show(/holds none of this token/.test(m.error) ? "info" : "err", `Sell ${sym} failed: ${m.error}`); playSfx("err"); fin(); }
      });
      port.onDisconnect.addListener(() => fin());
      const msg: SellPortIn = { type: "sell", side: "sell", walletId: w.id, mint: t.mint, pct, slippagePct: prefs.slippagePct };
      port.postMessage(msg);
    }
    function drawHeld() {
      const l = heldL;
      rail.hidden = htog.hidden = !l.length;
      if (!l.length) { grid.classList.remove("hon"); htog.setAttribute("aria-pressed", "false"); }
      if (selMint && !l.some((x) => x.mint === selMint)) selMint = null;
      drawSum2();
      railList.replaceChildren(...l.map((t) => {
        const sym = t.symbol ? `$${t.symbol}` : `${t.mint.slice(0, 4)}…`;
        const p = heldPnl.get(t.mint) ?? (t.mint === mint ? curPnl : null) ?? undefined;
        const pv = p?.pnlPct ?? null, c = p ? pv : t.change24h;
        const cls = c === null || c === undefined ? "flat" : c > 0 ? "up" : c < 0 ? "dn" : "flat";
        const lg = t.image ? h("img", { class: "hlogo", src: t.image, alt: "" }) : h("span", { class: "hlogo" }, (t.symbol || "?").slice(0, 1).toUpperCase());
        if (lg instanceof HTMLImageElement) lg.addEventListener("error", () => lg.replaceWith(h("span", { class: "hlogo" }, (t.symbol || "?").slice(0, 1).toUpperCase())));
        const s = railSt.get(t.mint), run = s?.kind === "run", arm = s?.kind === "arm";
        const btn = (pct: number, txt: string) => h("button", { class: `hsb${pct === 100 && arm ? " arm" : ""}`, type: "button", disabled: run, "data-testid": "hb-ca-held-sell",
          title: pct === 100 ? (arm ? `Tap again to sell all ${sym}` : `Sell all ${sym} (tap twice)`) : `Sell ${pct}% of ${sym}`,
          onclick: () => {
            if (pct === 100 && !arm) { const tm = setTimeout(() => { if (railSt.get(t.mint)?.kind === "arm") { railSt.delete(t.mint); drawHeld(); } }, 2500); railSt.set(t.mint, { kind: "arm", t: tm }); drawHeld(); return; }
            if (arm && s?.kind === "arm") clearTimeout(s.t);
            railSell(t, pct, sym);
          } }, run ? "…" : pct === 100 && arm ? "Sure?" : txt);
        const pnlTxt = p ? (pv === null ? "—" : fmtChange(pv)) : c === null ? "" : fmtChange(c);
        const sel = selMint === t.mint;
        const pick = () => { selMint = sel ? null : t.mint; drawHeld(); railList.querySelector<HTMLElement>(`[data-mint="${t.mint}"]`)?.focus(); };
        const row = h("div", { class: `hrow${t.mint === mint ? " on" : ""}${sel ? " sel" : ""}`, role: "listitem", tabindex: "0", "data-mint": t.mint,
          title: `${t.name ?? sym} · ${t.mint}\n${p ? "PnL" : "24h change"} ${pnlTxt || "—"}\n${sel ? "Tap again for the total PnL" : "Tap to show its PnL beside Holding"}`,
          "data-testid": "hb-ca-held-row", "aria-current": t.mint === mint ? "true" : "false", "aria-selected": String(sel) },
          h("div", { class: "hl1" }, lg, h("span", { class: "hsym" }, sym), h("span", { class: `hchg ${cls}`, "data-testid": "hb-ca-held-pnl", "aria-label": `${p ? "PnL" : "24h change"} ${pnlTxt}`,
              title: p ? `PnL ${pnlTxt || "—"} (unrealized, from your highbar cost basis)` : `24h change ${pnlTxt || "—"} (no cost basis known for this token)` }, pnlTxt),
            h("span", { class: "hval" }, t.valueUsd !== null ? fmtUsdCompact(t.valueUsd) : "—")),
          h("div", { class: "hl2" }, h("span", { class: "hbtns", role: "group", "aria-label": `Sell ${sym}` }, btn(25, "25"), btn(50, "50"), btn(100, "All"))));
        row.addEventListener("click", (e) => { if (!(e.target as Element).closest("button")) pick(); });
        row.addEventListener("keydown", (e) => { if ((e.key === "Enter" || e.key === " ") && e.target === row) { e.preventDefault(); pick(); } });
        return row;
      }));
    }

    // slippage popover: 0.5 / 1 / 5 % or a custom value, kept for the next popup
    const slipIn = h("input", { type: "text", inputmode: "decimal", "aria-label": "Custom slippage percent", "data-testid": "hb-ca-slip-custom" }) as HTMLInputElement;
    const slipChips = h("div", { class: "row" });
    const prioIn = h("input", { type: "text", inputmode: "decimal", placeholder: "custom", "aria-label": "Custom priority fee in SOL", "data-testid": "hb-ca-prio-custom" }) as HTMLInputElement;
    const prioChips = h("div", { class: "row" }), prioErr = h("div", { class: "perr", role: "alert", "data-testid": "hb-ca-prio-err" });
    const slipPop = h("div", { class: "slip", hidden: true, role: "dialog", "aria-label": "Slippage and priority fee", "data-testid": "hb-ca-slip" },
      h("div", { class: "t" }, "Max slippage"), h("div", { class: "row" }, slipChips, h("span", { class: "cus" }, slipIn, h("span", {}, "%"))),
      h("div", { class: "note" }, "The swap fails instead of filling worse than this. Kept for every token."),
      // priority fee: the same setting as the side panel's Settings, for every buy, sell and launch
      h("div", { class: "t pt" }, "Priority fee"), h("div", { class: "row" }, prioChips, h("span", { class: "cus" }, prioIn, h("span", {}, "SOL"))),
      prioErr, h("div", { class: "note" }, "Paid to validators to land the transaction faster. Total per transaction, max 0.1 SOL."));
    root.append(slipPop);
    const drawSlip = () => {
      gearB.replaceChildren(svg(GEAR), h("span", {}, `${prefs.slippagePct}%`));
      slipChips.replaceChildren(...CA_SLIPPAGE_PRESETS.map((v) => h("button", { class: `chip${prefs.slippagePct === v ? " on" : ""}`, type: "button", "aria-pressed": String(prefs.slippagePct === v), "data-testid": "hb-ca-slip-chip", onclick: () => setSlip(v) }, `${v}%`)));
      if (document.activeElement !== popHost) slipIn.value = (CA_SLIPPAGE_PRESETS as readonly number[]).includes(prefs.slippagePct) ? "" : String(prefs.slippagePct);
      drawSum();
    };
    const drawPrio = () => {
      const v = fee?.prioritySol ?? PRIORITY_DEFAULT_SOL;
      prioChips.replaceChildren(...PRIORITY_PRESETS_SOL.map((x) => h("button", { class: `chip${v === x ? " on" : ""}`, type: "button", "aria-pressed": String(v === x), "data-testid": "hb-ca-prio-chip", onclick: () => setPrio(x) }, String(x))));
      if (document.activeElement !== popHost) prioIn.value = (PRIORITY_PRESETS_SOL as readonly number[]).includes(v) ? "" : String(v);
      drawSum();
    };
    const setPrio = (v: number) => {
      prioErr.textContent = "";
      fee = { ...(fee ?? { enabled: false, bps: 2 }), prioritySol: readPrioritySol(v) }; drawPrio();
      void ask({ type: "priority:set", sol: v }).then((r) => { if (fee) fee.prioritySol = r.prioritySol; drawPrio(); }).catch((e) => { prioErr.textContent = String((e as Error)?.message ?? e); });
    };
    const commitPrio = () => { const e = priorityError(prioIn.value); if (!prioIn.value.trim()) return; prioErr.textContent = e ?? ""; if (!e) setPrio(Number(prioIn.value.replace(",", "."))); };
    prioIn.addEventListener("change", commitPrio);
    prioIn.addEventListener("keydown", (e) => { if ((e as KeyboardEvent).key === "Enter") commitPrio(); });
    const setSlip = (v: number) => { prefs.slippagePct = cleanCaSlippage(v); drawSlip(); void ask({ type: "ca:prefs:set", slippagePct: prefs.slippagePct }).then((p) => { prefs = p; drawSlip(); }).catch(() => {}); };
    const commitCustom = () => { const n = Number(slipIn.value.replace(",", ".")); if (slipIn.value.trim() && Number.isFinite(n)) setSlip(n); };
    slipIn.addEventListener("change", commitCustom);
    slipIn.addEventListener("keydown", (e) => { if ((e as KeyboardEvent).key === "Enter") commitCustom(); });
    gearB.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!slipPop.hidden) { slipPop.hidden = true; gearB.setAttribute("aria-expanded", "false"); return; }
      const r = gearB.getBoundingClientRect();
      slipPop.style.top = `${Math.round(r.bottom + 6)}px`; slipPop.style.left = `${Math.round(Math.max(8, Math.min(r.right - 250, innerWidth - 258)))}px`;
      slipPop.hidden = false; gearB.setAttribute("aria-expanded", "true");
    });
    root.addEventListener("pointerdown", (e) => { const t = e.target as Node; if (!slipPop.contains(t) && !gearB.contains(t)) { slipPop.hidden = true; gearB.setAttribute("aria-expanded", "false"); } }, true);

    // trade box
    const sideSeg = h("div", { class: "seg side", role: "tablist", "aria-label": "Buy or sell" });
    // Buy / Sell, then the trade wallets and the slippage / priority gear on the same row
    const trow = h("div", { class: "trow" }, sideSeg, wslot, gearB);
    const amts = h("div", { class: "amts", role: "group" });
    const custom = h("input", { type: "text", inputmode: "decimal", autocomplete: "off", spellcheck: "false", "data-testid": "hb-ca-amount" }) as HTMLInputElement;
    const warmT = { t: null as ReturnType<typeof setTimeout> | null };
    /** Warm the worker's caches for the amount being picked (debounced): pool / quote and a blockhash, nothing is built. */
    const warmUp = (sol?: number | null) => { if (warmT.t) clearTimeout(warmT.t); warmT.t = setTimeout(() => { warmT.t = null; void ask({ type: "trade:warm", mint, ...(sol ? { sol } : {}) }).catch(() => {}); }, 250); };
    const cta = h("button", { class: "cta", type: "button", "data-testid": "hb-ca-go" });
    // progress shows in the button; results and errors go to the page's top center toasts (no bottom bar)
    let stepNow = "";
    const amount = () => (prefs.tab === "buy" ? buySol : sellPct);
    const sym = () => (info?.symbol ? `$${info.symbol}` : label.startsWith("$") ? label : "token");
    let fee: (FeeInfo & { prioritySol: number }) | null = null, held: CaPosition | null = null;
    void ask({ type: "fee:info" }).then((f) => { fee = f; drawPrio(); }).catch(() => {});
    function drawSum() {
      const ws = sw?.get() ?? [], a = amount();
      // no cost lines under the amounts: the fee and priority logic is unchanged (the worker adds both), only a wallet
      // that cannot pay the amount, priority and fee turns the button into a short error state
      const poor = prefs.tab === "buy" && !busy ? shortOnSol(ws, a, fee?.prioritySol ?? PRIORITY_DEFAULT_SOL, fee) : [];
      const ok = !!a && !!ws.length && !busy && !!info && !poor.length;
      cta.className = `cta${prefs.tab === "sell" ? " sell" : ""}${poor.length ? " err" : ""}`;
      cta.setAttribute("aria-disabled", String(!ok));
      cta.textContent = busy ? stepNow || "Working…" : poor.length ? `Not enough SOL${ws.length > 1 ? ` · ${poor.length === 1 ? poor[0].label : `${poor.length} wallets`}` : ""}`
        : prefs.tab === "buy" ? `Buy ${sym()}${a ? ` · ${fmtSol(a)} SOL` : ""}` : `Sell ${a ? `${a}% ` : ""}${sym()}`;
      cta.title = poor.length ? `${poor.map((w) => w.label).join(", ")}: not enough SOL for the amount, the priority fee and the highbar fee` : "";
    }
    function drawTrade() {
      sideSeg.replaceChildren(...(["buy", "sell"] as const).map((s) => h("button", { class: `${prefs.tab === s ? "on " : ""}${s}`, type: "button", role: "tab", "aria-selected": String(prefs.tab === s), "data-testid": `hb-ca-tab-${s}`,
        onclick: () => { prefs.tab = s; custom.value = ""; void ask({ type: "ca:prefs:set", tab: s }).catch(() => {}); drawTrade(); } }, s === "buy" ? "Buy" : "Sell")));
      const buy = prefs.tab === "buy";
      custom.placeholder = buy ? "SOL" : "%"; custom.setAttribute("aria-label", buy ? "Buy amount in SOL" : "Sell percent");
      const chips = buy ? presets : [...SELL_PCTS];
      amts.replaceChildren(...chips.map((v) => {
        const on = buy ? buySol === v : sellPct === v;
        return h("button", { class: `chip${on ? " on" : ""}`, type: "button", "aria-pressed": String(on), "data-testid": buy ? "hb-ca-buy-chip" : "hb-ca-sell-chip",
          onclick: () => { if (buy) { buySol = v; warmUp(v); } else sellPct = v; custom.value = ""; drawTrade(); } }, buy ? fmtSol(v) : `${v}%`);
      }), h("div", { class: "solin" }, buy ? svg(SOL_MARK) : null, custom));
      drawSum();
    }
    custom.addEventListener("input", () => {
      if (prefs.tab === "buy") { buySol = parseBuySol(custom.value); warmUp(buySol); } else sellPct = parsePct(custom.value);
      amts.querySelectorAll(".chip").forEach((c) => { c.classList.remove("on"); c.setAttribute("aria-pressed", "false"); });
      drawSum();
    });

    cta.addEventListener("click", async () => {
      const ws = sw?.get() ?? [], a = amount();
      if (cta.getAttribute("aria-disabled") === "true" || !a || !ws.length || !info) return;
      primeSfx();
      busy = true; sw?.lock(); drawSum();
      const side = prefs.tab, slip = prefs.slippagePct;
      for (const w of ws) {
        const who = ws.length > 1 ? `${w.label} · ` : "";
        stepNow = ""; drawSum();
        const what = side === "buy" ? "Buy" : "Sell";
        await new Promise<void>((res) => {
          const port = chrome.runtime.connect({ name: "sell" });
          // fast mode: "Sent" frees the button at once (res), the port stays open for the background confirmation
          let sent = false;
          const fin = () => { try { port.disconnect(); } catch { /* gone */ } res(); loadPos(); loadHeld(); };
          port.onMessage.addListener((m: SellPortOut) => {
            if (m.type === "step") { if (!sent) { stepNow = `${STEP[m.step]}…${ws.length > 1 ? ` · ${w.label}` : ""}`; drawSum(); } }
            else if (m.type === "sent") { sent = true; toasts().show("ok", `${who}${what} sent`, m.solscanUrl); playSfx("ok"); res(); }
            else if (m.type === "done") { if (!sent) { toasts().show("ok", `${who}${what} success`, m.solscanUrl); playSfx("ok"); } fin(); }
            // "holds none of this token" is not a failure, nothing was built or signed: an info toast
            else { toasts().show(/holds none of this token/.test(m.error) ? "info" : "err", `${who}${sent ? `${what} failed: ` : ""}${m.error}`); playSfx("err"); fin(); }
          });
          port.onDisconnect.addListener(() => res());
          const msg: SellPortIn = side === "buy" ? { type: "sell", side: "buy", walletId: w.id, mint, pct: 0, sol: a, slippagePct: slip } : { type: "sell", side: "sell", walletId: w.id, mint, pct: a, slippagePct: slip };
          port.postMessage(msg);
        });
      }
      busy = false; stepNow = ""; sw?.unlock?.(); drawSum(); void sw?.load(true, true);
      // the PnL card: the new balance now, and once more when the worker has written the trade to the ledger
      loadPos(); if (posT) clearTimeout(posT); posT = setTimeout(() => { posT = null; if (popHost.isConnected) loadPos(); }, 4000);
    });

    // token head, chart, stats
    const chartBox = h("div", { class: "chart", "data-testid": "hb-ca-chart" });
    let chartFor = "";
    const drawChart = () => {
      if (!info) return;
      // pump.fun knows the coin (whatever its address ends with): its own 1 s candles
      const pool = info.pool ?? "", pump = info.sources.includes("pump.fun") || !!info.pumpBlocked, priced = info.priceUsd !== null;
      const key = `${pool}|${info.highbar ? 1 : 0}|${pump ? 1 : 0}`;
      if (key === chartFor) return;
      if (info.partial && !pool && !pump && !info.highbar) return; // more sources are coming, wait for them
      chartFor = key;
      if (!pool && !pump && !info.highbar && !priced) { chartBox.replaceChildren(h("div", { class: "empty" }, "No chart yet for this token")); return; }
      // chart.html draws the candles (pump.fun 1 s, the highbar api, GeckoTerminal or live 1 s bars, through the worker)
      const qs = new URLSearchParams({ mint, theme: "dark", ...(pool ? { pool } : {}), ...(info.highbar ? { hb: "1" } : {}), ...(pump ? { pf: "1" } : {}) });
      chartBox.replaceChildren(h("iframe", { src: chrome.runtime.getURL(`chart.html?${qs.toString()}`), title: `${sym()} chart`, referrerpolicy: "no-referrer", "data-testid": "hb-ca-chart-frame" }));
    };
    // head and stats are built once and then updated in place: refreshes (every 15 s) and live ticks (every second) only
    // change text, so nothing unmounts, re-mounts or shows a loading state while the popup is open
    // token audit: asked as the popup opens, beside the market data (the worker reads the chain, 60 s cache)
    const audit = auditCard();
    // live PnL of the first selected wallet: asked on open, on a wallet change, after a trade and with the 15 s refresh
    const pnlc = pnlCard(() => info?.symbol ?? "");
    let posReq = 0, posT: ReturnType<typeof setTimeout> | null = null;
    function posPnl(p: CaPosition | null): { pnlSol: number | null; pnlPct: number | null } | null {
      if (!p) return null;
      let raw = 0n; try { raw = BigInt(p.balanceRaw); } catch { return null; }
      const usd = info?.priceUsd ?? null, priceSol = usd !== null && p.solUsd ? usd / p.solUsd : null;
      const r = pnl(raw, p.decimals, priceSol, p.entries);
      return raw > 0n && r.pnlPct !== null ? { pnlSol: r.pnlSol, pnlPct: r.pnlPct } : null;
    }
    function loadPos() {
      const w = sw?.get()[0];
      if (!w) { pnlc.set(null); return; }
      const id = ++posReq;
      void ask({ type: "ca:position", walletId: w.id, mint }).then((p) => { if (id === posReq) { held = p; pnlc.price(info?.priceUsd ?? null); pnlc.set(p); drawSum(); curPnl = posPnl(p); drawHeld(); } }).catch(() => {});
    }
    void ask({ type: "ca:audit", mint }).then((a) => audit.set(a)).catch(() => audit.set(null));
    const head = h("div", { class: "tok" }), stats = h("div", { class: "stats" });
    const priceEl = h("span", { class: "p" }), chgEl = h("span", { class: "chg flat", title: "24h change" });
    const priceBox = h("div", { class: "tprice", "data-testid": "hb-ca-price" }, priceEl, chgEl);
    const statEl = (kk: string, key: string, tip: string) => { const v = h("span", { class: "v", "data-k": key }); return [h("span", { class: "stat", title: tip }, h("span", { class: "k" }, kk), v), v] as const; };
    const [mcapBox, mcapEl] = statEl("MC", "mcap", "Market cap"), [volBox, volEl] = statEl("Vol", "vol", "Volume 24h"), [liqBox, liqEl] = statEl("Liq", "liq", "Liquidity");
    stats.append(mcapBox, volBox, liqBox);
    // one thin line: market cap, volume and liquidity, the audit shields on the right
    const meta = h("div", { class: "meta" }, stats, audit.el);
    let headKey = "";
    const drawNumbers = () => {
      if (!info) return;
      tweenText(priceEl, info.priceUsd, fmtUsdPrice);
      const c = info.change24h, cls = `chg ${c === null ? "flat" : c > 0 ? "up" : c < 0 ? "dn" : "flat"}`;
      if (chgEl.className !== cls) chgEl.className = cls;
      const ct = fmtChange(c); if (chgEl.textContent !== ct) chgEl.textContent = ct;
      tweenText(mcapEl, info.mcapUsd, fmtUsdFixed); tweenText(volEl, info.volume24hUsd, fmtUsdFixed); tweenText(liqEl, info.liquidityUsd, fmtUsdFixed);
      pnlc.price(info.priceUsd);
    };
    const drawInfo = () => {
      if (!info) return;
      // the logo, name and symbol row only changes when one of them does (a logo arriving later)
      const key = `${info.image ?? ""}|${info.name}|${info.symbol}|${info.verified ? 1 : 0}`;
      if (key !== headKey) {
        headKey = key;
        const logo = info.image ? h("img", { class: "tlogo", src: info.image, alt: "" }) : h("span", { class: "tlogo", "aria-hidden": "true" }, (info.symbol || "?").slice(0, 1).toUpperCase());
        if (logo instanceof HTMLImageElement) logo.addEventListener("error", () => logo.replaceWith(h("span", { class: "tlogo" }, (info?.symbol || "?").slice(0, 1).toUpperCase())));
        const ca = k.caLine(mint, true); ca.title = `${mint}\nAlways verify the contract address`;
        head.replaceChildren(logo,
          h("div", { class: "tname" }, h("div", { class: "tn1" }, h("span", { class: "nm", title: info.name }, info.name), info.verified ? svg(VERIFIED) : null, h("span", { class: "tsym" }, `$${info.symbol}`))),
          priceBox, ca);
      }
      drawNumbers();
      drawChart(); drawSum();
    };
    // live: price, 24h change, market cap, volume and liquidity from the worker's realtime tick; numbers glide to the new value
    let lastLiveAt = 0;
    const applyLive = (l: LiveStats) => {
      if (!info || l.mint !== mint || !head.isConnected) return;
      const pick = (a: number | null, b: number | null) => (a !== null && Number.isFinite(a) ? a : b);
      info = { ...info, priceUsd: pick(l.priceUsd, info.priceUsd), mcapUsd: pick(l.mcapUsd, info.mcapUsd), change24h: pick(l.change24h, info.change24h), volume24hUsd: pick(l.volume24hUsd, info.volume24hUsd), liquidityUsd: pick(l.liquidityUsd, info.liquidityUsd) };
      lastLiveAt = Date.now();
      drawNumbers();
      if (pop.getAttribute("data-live-src") !== (l.source ?? "")) pop.setAttribute("data-live-src", l.source ?? "");
    };
    const build = () => {
      warmUp(prefs.tab === "buy" ? buySol : null);
      hslot.replaceChildren(head);
      body.replaceChildren(meta, chartBox, pnlc.el, trow, amts);
      foot.replaceChildren(cta, builtOn());
      drawInfo(); drawTrade();
    };
    let logoTries = 0, partTries = 0, logoT: ReturnType<typeof setTimeout> | null = null;
    const t0 = performance.now();
    const load = async (fresh: boolean) => {
      try {
        const next = await ask({ type: "ca:info", mint, fresh });
        // a live tick in the last 5 s is newer than the refresh: keep its price, market cap and change (no glide back)
        const keep = info && Date.now() - lastLiveAt < 5000 ? { priceUsd: info.priceUsd, mcapUsd: info.mcapUsd, change24h: info.change24h } : null;
        info = keep ? { ...next, ...keep } : next;
        if (!head.isConnected) build(); else drawInfo();
        if (fresh) { loadPos(); loadHeld(); }
        if (!pop.hasAttribute("data-t-info")) pop.setAttribute("data-t-info", String(Math.round(performance.now() - t0)));
        // the worker answers with what came in 1.5 s (partial) and before a slow logo: ask again soon for the rest
        if (info.partial && partTries < 6 && popHost.isConnected) { partTries++; if (logoT) clearTimeout(logoT); logoT = setTimeout(() => void load(false), 700); }
        else if (!info.image && logoTries < 3 && popHost.isConnected) { logoTries++; if (logoT) clearTimeout(logoT); logoT = setTimeout(() => void load(false), 1500 * logoTries); }
      }
      catch (e) { if (!info) body.replaceChildren(h("div", { class: "result" }, h("strong", {}, "No market data"), h("span", { class: "muted" }, `${(e as Error).message || "Could not load this token"}. CA ${mint}`)), k.terminalRow(mint, null)); }
    };
    void Promise.all([ask({ type: "ca:prefs:get" }).then((p) => { prefs = p; }).catch(() => {}), ask({ type: "drawer:devpresets:get" }).then((r) => { const v = r.values.filter((x) => x > 0 && x <= BUY_MAX_SOL); if (v.length) presets = v; }).catch(() => {})])
      .then(() => { drawSlip(); if (info) drawTrade(); });
    drawSlip();
    void load(false);
    // realtime ticks for this one open popup (the worker serves them from pump.fun 1 s / Jupiter price, cached and gated).
    // Timers only exist while the popup is open and the tab is visible: a hidden tab clears them, showing it starts them again.
    let liveBusy = false;
    const liveTick = () => {
      if (document.visibilityState !== "visible" || !info || liveBusy) return;
      liveBusy = true;
      void ask({ type: "ca:live", mint }).then(applyLive).catch(() => {}).finally(() => { liveBusy = false; });
    };
    let poll: ReturnType<typeof setInterval> | null = null, livePoll: ReturnType<typeof setInterval> | null = null;
    const startPolls = () => { if (poll) return; poll = setInterval(() => void load(true), 15_000); livePoll = setInterval(liveTick, 1000); };
    const stopPolls = () => { if (poll) clearInterval(poll); if (livePoll) clearInterval(livePoll); poll = livePoll = null; };
    const onVis = () => { if (document.visibilityState === "visible") { startPolls(); liveTick(); } else stopPolls(); };
    document.addEventListener("visibilitychange", onVis);
    if (document.visibilityState === "visible") startPolls();

    if (!st?.exists) foot.replaceChildren(h("button", { class: "cta", type: "button", onclick: () => { void ask({ type: "open:sidepanel" }).catch(() => {}); } }, "Create a wallet in the side panel"), builtOn());

    document.documentElement.append(popHost);
    // placement: next to the button (or the dragged spot), kept on screen, header drags it, double click resets
    const vp = () => ({ w: document.documentElement.clientWidth || innerWidth, h: innerHeight });
    let pos: Pos = { left: 0, top: 0 };
    const apply = (p: Pos) => { const r = pop.getBoundingClientRect(); pos = clampPos(p, { w: r.width, h: r.height }, vp()); pop.style.left = `${pos.left}px`; pop.style.top = `${pos.top}px`; };
    // beside the timeline column (right, then left) at the pill's height, else below or over the pill; all from the two
    // rects measured once at click time (no observers on X's layout)
    const near = (): Pos => { const r = pop.getBoundingClientRect(); return placeBeside(anchor, column ?? tweet, { w: r.width, h: r.height }, vp()); };
    // the last dragged spot while it is still fully on screen (the window may have shrunk), else the default; dblclick resets
    const saved = o.savedPos(), r0 = pop.getBoundingClientRect();
    apply(saved && onScreen(saved, { w: r0.width, h: r0.height }, vp()) ? saved : near());
    const ro = new ResizeObserver(() => apply(pos)); ro.observe(pop);
    const onResize = () => apply(pos); addEventListener("resize", onResize);
    let drag: { id: number; dx: number; dy: number } | null = null;
    header.addEventListener("pointerdown", (e) => { if (e.button !== 0 || (e.target as Element).closest("button")) return; e.preventDefault(); drag = { id: e.pointerId, dx: e.clientX - pos.left, dy: e.clientY - pos.top }; header.setPointerCapture(e.pointerId); pop.classList.add("dragging", "moved"); });
    header.addEventListener("pointermove", (e) => { if (drag && e.pointerId === drag.id) apply({ left: e.clientX - drag.dx, top: e.clientY - drag.dy }); });
    const end = (e: PointerEvent) => { if (!drag || e.pointerId !== drag.id) return; drag = null; pop.classList.remove("dragging"); o.setSavedPos({ ...pos }); void ask({ type: "ca:pos:set", pos: { ...pos } }).catch(() => {}); };
    header.addEventListener("pointerup", end); header.addEventListener("pointercancel", end);
    header.addEventListener("dblclick", (e) => { if ((e.target as Element).closest("button")) return; o.setSavedPos(null); void ask({ type: "ca:pos:set", pos: null }).catch(() => {}); apply(near()); });
    const cleanup = () => { if (warmT.t) clearTimeout(warmT.t); stopTweens([priceEl, mcapEl, volEl, liqEl, ...pnlc.el.querySelectorAll<HTMLElement>(".pv,.ppct")]); if (posT) clearTimeout(posT); stopPolls(); document.removeEventListener("visibilitychange", onVis); if (logoT) clearTimeout(logoT); ro.disconnect(); removeEventListener("resize", onResize); document.removeEventListener("keydown", onKey, true); };
    return { host: popHost, cleanup };
}
