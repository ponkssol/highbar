/** The CA popup (price, live stats, chart frame, buy and sell box). Loaded on demand from the content script the first time a
 *  token button is opened (dynamic import of a packaged, web accessible module), so x.com pages that never open a popup do not
 *  parse this code or its CSS. Like the drawer, nothing here sees a key: the worker resolves, fetches, builds, checks, signs,
 *  simulates and sends. */
import type { CaPrefs, LiveStats, SellPortIn, SellPortOut } from "../lib/messages";
import { fmtChange, fmtUsdPrice, type CaInfo } from "../lib/ca";
import { CA_SLIPPAGE_PRESETS, cleanCaSlippage } from "../lib/caprefs";
import { DEV_PRESETS_DEFAULT } from "../lib/devpresets";
import { parsePct } from "../lib/holding";
import type { SellStep } from "../lib/sell";
import { BUY_MAX_SOL } from "../lib/limits";
import { fmtSol } from "../lib/format";
import { CLOSE, GEAR, HB_MARK, SOL_MARK } from "../lib/icons";
import { clampPos, type Pos } from "../lib/place";
import { ask, h, scrollFade, svg } from "./dom";
import { stopTweens, tweenText } from "./tween";
import { auditCard } from "./audit-card";
import { pnlCard } from "./pnl-card";
import { playSfx, primeSfx } from "../lib/sfx";
import { fmtUsdFixed } from "../lib/tween";
import { CA_CSS, DRAWER_CSS } from "./styles";
import { parseBuySol } from "./holding";
import type { CaKit } from "./ca";

const VERIFIED = `<svg class="vbadge" viewBox="0 0 16 16" aria-label="Verified on Jupiter" role="img"><path fill="currentColor" d="M8 1l1.7 1.3 2.1-.2.7 2 1.8 1.1-.5 2.1.9 1.9-1.6 1.4-.1 2.1-2.1.4L9.6 15 8 13.7 6.4 15l-1.3-1.7-2.1-.4-.1-2.1L1.3 9.4l.9-1.9-.5-2.1 1.8-1.1.7-2 2.1.2z"/><path d="M5.3 8.2l1.8 1.8 3.6-3.7" stroke="#111" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const STEP: Record<SellStep, string> = { build: "Building", sign: "Signing in the extension", simulate: "Simulating", send: "Sending", confirm: "Confirming on Solana" };
const SELL_PCTS = [25, 50, 100] as const;

export interface PopupOpts { k: CaKit; mint: string; label: string; anchor: DOMRect | null; tweet: DOMRect | null;
  savedPos(): Pos | null; setSavedPos(p: Pos | null): void; close(): void }

export function mountPopup(o: PopupOpts): { host: HTMLElement; cleanup(): void } {
    const { k, mint, label, anchor, tweet } = o;
    k.injectFonts();
    const st = k.status();
    const popHost = h("div", { "data-hb-ca-pop": "" });
    const root = popHost.attachShadow({ mode: "closed" });
    const style = h("style"); style.textContent = DRAWER_CSS + CA_CSS;
    let prefs: CaPrefs = { slippagePct: 1, tab: "buy" };
    let info: CaInfo | null = null, presets: number[] = [...DEV_PRESETS_DEFAULT].filter((v) => v > 0);
    let buySol: number | null = null, sellPct: number | null = null, busy = false;

    const wslot = h("span", { class: "wslot" });
    const gearB = h("button", { class: "gearb", type: "button", "aria-haspopup": "dialog", "aria-expanded": "false", title: "Slippage", "data-testid": "hb-ca-slip-btn" });
    const header = h("header", { title: "Drag to move, double click to reset", "data-testid": "hb-ca-head" }, svg(HB_MARK), h("h2", {}, "Trade"), h("span", { style: "flex:1" }), wslot, gearB,
      h("button", { class: "x", type: "button", "aria-label": "Close", onclick: () => o.close(), html: CLOSE }));
    const body = scrollFade(h("div", { class: "body" }, h("div", { class: "loading" }, `Loading ${label}…`)));
    const foot = h("footer");
    const pop = h("div", { class: "drawer capop", role: "dialog", "aria-modal": "false", "aria-label": `Trade ${label}`, "data-testid": "hb-ca-pop" }, header, body, foot);
    root.append(style, pop);
    for (const ev of ["keydown", "keyup", "keypress"]) pop.addEventListener(ev, (e) => e.stopPropagation());
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && popHost.isConnected) { e.stopPropagation(); if (!slipPop.hidden) { slipPop.hidden = true; gearB.setAttribute("aria-expanded", "false"); return; } if (sw?.close()) return; o.close(); } };
    document.addEventListener("keydown", onKey, true);

    // wallets (the drawer's multi select picker and its checked wallets)
    const sw = st?.exists ? k.walletSwitcher(root, st.network, (ws) => { void ask({ type: "drawer:wallets:set", ids: ws.map((w) => w.id) }).catch(() => {}); drawTrade(); loadPos(); }, "Trade wallets") : null;
    if (sw) { wslot.append(sw.btn); root.append(sw.pop); void Promise.all([ask({ type: "wallets:list" }), ask({ type: "drawer:wallets:get" })]).then(([l, d]) => { sw.set(l, d.ids); drawTrade(); void sw.load(true); loadPos(); }).catch(() => {}); }

    // slippage popover: 0.5 / 1 / 5 % or a custom value, kept for the next popup
    const slipIn = h("input", { type: "text", inputmode: "decimal", "aria-label": "Custom slippage percent", "data-testid": "hb-ca-slip-custom" }) as HTMLInputElement;
    const slipChips = h("div", { class: "row" });
    const slipPop = h("div", { class: "slip", hidden: true, role: "dialog", "aria-label": "Slippage", "data-testid": "hb-ca-slip" },
      h("div", { class: "t" }, "Max slippage"), h("div", { class: "row" }, slipChips, h("span", { class: "cus" }, slipIn, h("span", {}, "%"))),
      h("div", { class: "note" }, "The swap fails instead of filling worse than this. Kept for every token."));
    root.append(slipPop);
    const drawSlip = () => {
      gearB.replaceChildren(svg(GEAR), h("span", {}, `${prefs.slippagePct}%`));
      slipChips.replaceChildren(...CA_SLIPPAGE_PRESETS.map((v) => h("button", { class: `chip${prefs.slippagePct === v ? " on" : ""}`, type: "button", "aria-pressed": String(prefs.slippagePct === v), "data-testid": "hb-ca-slip-chip", onclick: () => setSlip(v) }, `${v}%`)));
      if (document.activeElement !== popHost) slipIn.value = (CA_SLIPPAGE_PRESETS as readonly number[]).includes(prefs.slippagePct) ? "" : String(prefs.slippagePct);
      drawSum();
    };
    const setSlip = (v: number) => { prefs.slippagePct = cleanCaSlippage(v); drawSlip(); void ask({ type: "ca:prefs:set", slippagePct: prefs.slippagePct }).then((p) => { prefs = p; drawSlip(); }).catch(() => {}); };
    const commitCustom = () => { const n = Number(slipIn.value.replace(",", ".")); if (slipIn.value.trim() && Number.isFinite(n)) setSlip(n); };
    slipIn.addEventListener("change", commitCustom);
    slipIn.addEventListener("keydown", (e) => { if ((e as KeyboardEvent).key === "Enter") commitCustom(); });
    gearB.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!slipPop.hidden) { slipPop.hidden = true; gearB.setAttribute("aria-expanded", "false"); return; }
      const r = gearB.getBoundingClientRect();
      slipPop.style.top = `${Math.round(r.bottom + 6)}px`; slipPop.style.left = `${Math.round(Math.max(8, Math.min(r.right - 236, innerWidth - 244)))}px`;
      slipPop.hidden = false; gearB.setAttribute("aria-expanded", "true");
    });
    root.addEventListener("pointerdown", (e) => { const t = e.target as Node; if (!slipPop.contains(t) && !gearB.contains(t)) { slipPop.hidden = true; gearB.setAttribute("aria-expanded", "false"); } }, true);

    // trade box
    const sideSeg = h("div", { class: "seg side", role: "tablist", "aria-label": "Buy or sell" });
    const amts = h("div", { class: "amts", role: "group" });
    const custom = h("input", { type: "text", inputmode: "decimal", autocomplete: "off", spellcheck: "false", "data-testid": "hb-ca-amount" }) as HTMLInputElement;
    const sum = h("div", { class: "sumline", "data-testid": "hb-ca-sum" });
    const cta = h("button", { class: "cta", type: "button", "data-testid": "hb-ca-go" });
    const runs = h("div", { class: "runs", "data-testid": "hb-ca-runs" });
    const amount = () => (prefs.tab === "buy" ? buySol : sellPct);
    const sym = () => (info?.symbol ? `$${info.symbol}` : label.startsWith("$") ? label : "token");
    function drawSum() {
      const ws = sw?.get() ?? [], a = amount();
      const route = !info ? "" : info.highbar ? (info.migrated ? "Meteora DAMM v2" : "Meteora DBC") : "Jupiter";
      sum.replaceChildren(h("span", {}, `${ws.length > 1 ? `${ws.length} wallets` : ws[0]?.label ?? "No wallet"}`), h("span", {}, "·"), h("span", {}, `${prefs.slippagePct}% slippage`), ...(route ? [h("span", {}, "·"), h("span", {}, `via ${route}`)] : []));
      const ok = !!a && !!ws.length && !busy && !!info;
      cta.className = `cta${prefs.tab === "sell" ? " sell" : ""}`;
      cta.setAttribute("aria-disabled", String(!ok));
      cta.textContent = busy ? "Working…" : prefs.tab === "buy" ? `Buy ${sym()}${a ? ` · ${fmtSol(a)} SOL` : ""}` : `Sell ${a ? `${a}% ` : ""}${sym()}`;
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
          onclick: () => { if (buy) buySol = v; else sellPct = v; custom.value = ""; drawTrade(); } }, buy ? fmtSol(v) : `${v}%`);
      }), h("div", { class: "solin" }, buy ? svg(SOL_MARK) : null, custom));
      drawSum();
    }
    custom.addEventListener("input", () => {
      if (prefs.tab === "buy") buySol = parseBuySol(custom.value); else sellPct = parsePct(custom.value);
      amts.querySelectorAll(".chip").forEach((c) => { c.classList.remove("on"); c.setAttribute("aria-pressed", "false"); });
      drawSum();
    });

    cta.addEventListener("click", async () => {
      const ws = sw?.get() ?? [], a = amount();
      if (cta.getAttribute("aria-disabled") === "true" || !a || !ws.length || !info) return;
      primeSfx();
      busy = true; sw?.lock(); drawSum();
      const side = prefs.tab, slip = prefs.slippagePct;
      runs.replaceChildren();
      for (const w of ws) {
        const line = h("div", { class: "run", "data-testid": "hb-ca-run" }, h("span", { class: "w" }, w.label), h("span", { class: "s" }, "Waiting"));
        runs.append(line);
        const s = line.querySelector(".s") as HTMLElement;
        await new Promise<void>((res) => {
          const port = chrome.runtime.connect({ name: "sell" });
          const fin = () => { try { port.disconnect(); } catch { /* gone */ } res(); };
          port.onMessage.addListener((m: SellPortOut) => {
            if (m.type === "step") s.textContent = `${STEP[m.step]}…`;
            else if (m.type === "done") { line.classList.add("ok"); s.replaceChildren(`${side === "buy" ? "Buy" : "Sell"} success · `, h("a", { class: "link", href: m.solscanUrl, target: "_blank", rel: "noopener noreferrer", "data-testid": "hb-ca-viewtx" }, "View tx")); playSfx("ok"); fin(); }
            else { line.classList.add("err"); s.textContent = m.error; playSfx("err"); fin(); }
          });
          port.onDisconnect.addListener(() => res());
          const msg: SellPortIn = side === "buy" ? { type: "sell", side: "buy", walletId: w.id, mint, pct: 0, sol: a, slippagePct: slip } : { type: "sell", side: "sell", walletId: w.id, mint, pct: a, slippagePct: slip };
          port.postMessage(msg);
        });
      }
      busy = false; sw?.unlock?.(); drawSum(); void sw?.load(true, true);
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
    function loadPos() {
      const w = sw?.get()[0];
      if (!w) { pnlc.set(null); return; }
      const id = ++posReq;
      void ask({ type: "ca:position", walletId: w.id, mint }).then((p) => { if (id === posReq) { pnlc.price(info?.priceUsd ?? null); pnlc.set(p); } }).catch(() => {});
    }
    void ask({ type: "ca:audit", mint }).then((a) => audit.set(a)).catch(() => audit.set(null));
    const head = h("div", { class: "tok" }), stats = h("div", { class: "stats" });
    const priceEl = h("span", { class: "p" }), chgEl = h("span", { class: "chg flat", title: "24h change" });
    const priceBox = h("div", { class: "tprice", "data-testid": "hb-ca-price" }, priceEl, chgEl);
    const statEl = (kk: string, key: string) => { const v = h("span", { class: "v", "data-k": key }); return [h("div", { class: "stat" }, h("span", { class: "k" }, kk), v), v] as const; };
    const [mcapBox, mcapEl] = statEl("Market cap", "mcap"), [volBox, volEl] = statEl("Vol 24h", "vol"), [liqBox, liqEl] = statEl("Liquidity", "liq");
    stats.append(mcapBox, volBox, liqBox);
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
        head.replaceChildren(logo,
          h("div", { class: "tname" }, h("div", { class: "tn1" }, h("span", { class: "nm", title: info.name }, info.name), info.verified ? svg(VERIFIED) : null, h("span", { class: "tsym" }, `$${info.symbol}`)), k.caLine(mint, true)),
          priceBox);
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
      body.replaceChildren(head, pnlc.el, chartBox, stats, audit.el, sideSeg, amts, sum, runs);
      foot.replaceChildren(cta, h("div", { class: "verify", "data-testid": "hb-ca-verify" }, "Always verify the contract address"));
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
        if (fresh) loadPos();
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

    if (!st?.exists) foot.replaceChildren(h("button", { class: "cta", type: "button", onclick: () => { void ask({ type: "open:sidepanel" }).catch(() => {}); } }, "Create a wallet in the side panel"));

    document.documentElement.append(popHost);
    // placement: next to the button (or the dragged spot), kept on screen, header drags it, double click resets
    const vp = () => ({ w: document.documentElement.clientWidth || innerWidth, h: innerHeight });
    let pos: Pos = { left: 0, top: 0 };
    const apply = (p: Pos) => { const r = pop.getBoundingClientRect(); pos = clampPos(p, { w: r.width, h: r.height }, vp()); pop.style.left = `${pos.left}px`; pop.style.top = `${pos.top}px`; };
    // below the button when it fits, else beside the tweet column (right, then left) at the button's height, else clamped
    const near = (): Pos => {
      const r = pop.getBoundingClientRect(), v = vp(), m = 12;
      if (!anchor) return { left: v.w - r.width - 20, top: 60 };
      if (anchor.bottom + 8 + r.height <= v.h - m) return { left: anchor.left, top: anchor.bottom + 8 };
      if (anchor.top - 8 - r.height >= m) return { left: anchor.left, top: anchor.top - 8 - r.height };
      const top = Math.max(m, Math.min(anchor.top - 40, v.h - r.height - m));
      if (tweet && tweet.right + 12 + r.width <= v.w - m) return { left: tweet.right + 12, top };
      if (tweet && tweet.left - 12 - r.width >= m) return { left: tweet.left - 12 - r.width, top };
      return { left: anchor.left, top: anchor.bottom + 8 };
    };
    apply(o.savedPos() ?? near());
    const ro = new ResizeObserver(() => apply(pos)); ro.observe(pop);
    const onResize = () => apply(pos); addEventListener("resize", onResize);
    let drag: { id: number; dx: number; dy: number } | null = null;
    header.addEventListener("pointerdown", (e) => { if (e.button !== 0 || (e.target as Element).closest("button")) return; e.preventDefault(); drag = { id: e.pointerId, dx: e.clientX - pos.left, dy: e.clientY - pos.top }; header.setPointerCapture(e.pointerId); pop.classList.add("dragging", "moved"); });
    header.addEventListener("pointermove", (e) => { if (drag && e.pointerId === drag.id) apply({ left: e.clientX - drag.dx, top: e.clientY - drag.dy }); });
    const end = (e: PointerEvent) => { if (!drag || e.pointerId !== drag.id) return; drag = null; pop.classList.remove("dragging"); o.setSavedPos({ ...pos }); void ask({ type: "ca:pos:set", pos: { ...pos } }).catch(() => {}); };
    header.addEventListener("pointerup", end); header.addEventListener("pointercancel", end);
    header.addEventListener("dblclick", (e) => { if ((e.target as Element).closest("button")) return; o.setSavedPos(null); void ask({ type: "ca:pos:set", pos: null }).catch(() => {}); apply(near()); });
    const cleanup = () => { stopTweens([priceEl, mcapEl, volEl, liqEl, ...pnlc.el.querySelectorAll<HTMLElement>(".pv,.ppct")]); if (posT) clearTimeout(posT); stopPolls(); document.removeEventListener("visibilitychange", onVis); if (logoT) clearTimeout(logoT); ro.disconnect(); removeEventListener("resize", onResize); document.removeEventListener("keydown", onKey, true); };
    return { host: popHost, cleanup };
}
