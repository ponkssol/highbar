/** Token detection on x.com and the CA popup. Tweets that name a Solana token (a CA in the text, a token page link or a $TICKER
 *  that resolves without doubt) get a small button under the name row. It opens a draggable popup with the token's price,
 *  24h change, market cap, volume, a live chart (GeckoTerminal, framed by an extension page because x.com's CSP blocks
 *  third party frames) and a buy and sell box. Like the drawer, nothing here sees a key: the worker resolves, fetches,
 *  builds, checks, signs, simulates and sends. */
import type { CaPrefs, SellPortIn, SellPortOut, WalletRow, WalletStatus } from "../lib/messages";
import { fmtChange, fmtUsdCompact, fmtUsdPrice, tweetCandidates, type CaInfo } from "../lib/ca";
import { CA_SLIPPAGE_PRESETS, cleanCaSlippage } from "../lib/caprefs";
import { DEV_PRESETS_DEFAULT } from "../lib/devpresets";
import { parsePct } from "../lib/holding";
import { BUY_MAX_SOL, type SellStep } from "../lib/sell";
import { fmtSol, short } from "../lib/format";
import { CLOSE, GEAR, HB_MARK, SOL_MARK } from "../lib/icons";
import { clampPos, readPos, type Pos } from "../lib/place";
import { ask, h, scrollFade, svg } from "./dom";
import { CA_CSS, CA_PILL_CSS, DRAWER_CSS } from "./styles";
import { parseBuySol } from "./holding";

export interface CaKit {
  status(): WalletStatus | null;
  injectFonts(): void;
  theme(): "light" | "dark";
  caLine(mint: string, compact?: boolean): HTMLElement;
  terminalRow(mint: string, tokenUrl: string | null | undefined, iconOnly?: boolean): HTMLElement;
  walletSwitcher(root: ShadowRoot, network: WalletStatus["network"], onChange: (checked: WalletRow[]) => void, label?: string): {
    btn: HTMLElement; pop: HTMLElement; close(): boolean; load(b: boolean, fresh?: boolean): Promise<void>; set(rows: WalletRow[], ids: string[]): WalletRow[]; get(): WalletRow[]; lock(): void; unlock?(): void };
}

const HOST = "data-hb-ca-host";
const ARROW = `<svg class="arr" viewBox="0 0 10 10" fill="none" aria-hidden="true"><path d="M3 7l4-4M3.6 3H7v3.4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const VERIFIED = `<svg class="vbadge" viewBox="0 0 16 16" aria-label="Verified on Jupiter" role="img"><path fill="currentColor" d="M8 1l1.7 1.3 2.1-.2.7 2 1.8 1.1-.5 2.1.9 1.9-1.6 1.4-.1 2.1-2.1.4L9.6 15 8 13.7 6.4 15l-1.3-1.7-2.1-.4-.1-2.1L1.3 9.4l.9-1.9-.5-2.1 1.8-1.1.7-2 2.1.2z"/><path d="M5.3 8.2l1.8 1.8 3.6-3.7" stroke="#111" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const STEP: Record<SellStep, string> = { build: "Building", sign: "Signing in the extension", simulate: "Simulating", send: "Sending", confirm: "Confirming on Solana" };
const SELL_PCTS = [25, 50, 100] as const;

export function initCa(k: CaKit) {
  // ---------------- detection ----------------
  /** The tweet's own text and links (not a quoted tweet's). */
  const mainText = (a: HTMLElement) => [...a.querySelectorAll<HTMLElement>('[data-testid="tweetText"]')].find((t) => !t.closest('[role="link"]') || t.closest('[role="link"]') === a) ?? null;
  const linkTexts = (a: HTMLElement, txt: HTMLElement | null) => {
    const out: string[] = [];
    const anchors = [...(txt?.querySelectorAll<HTMLAnchorElement>("a[href]") ?? []), ...a.querySelectorAll<HTMLAnchorElement>('[data-testid="card.wrapper"] a[href]')];
    for (const x of anchors) { out.push(x.href); const t = (x.textContent ?? "").trim(); if (t && !t.startsWith("$") && !t.startsWith("@") && !t.startsWith("#")) out.push(t); }
    return out;
  };
  /** The row to put the button after: the ancestor of the name row whose parent also holds the tweet text (or the actions). */
  const anchorRow = (a: HTMLElement, txt: HTMLElement | null): HTMLElement | null => {
    const name = a.querySelector<HTMLElement>('[data-testid="User-Name"]');
    if (!name) return null;
    const stop = txt ?? a.querySelector<HTMLElement>('[role="group"]');
    let row: HTMLElement = name;
    while (row.parentElement && row.parentElement !== a && stop && !row.parentElement.contains(stop)) row = row.parentElement;
    return row;
  };
  const enabled = () => k.status()?.caDetect !== false;

  type Found = { mint: string; label: string };
  const want = new WeakMap<HTMLElement, { text: string[]; links: string[]; tags: string[]; key: string }>();
  const done = new WeakMap<HTMLElement, string>();
  // Mint checks are batched over all tweets that came into range within 200 ms (one getMultipleAccounts for up to 20).
  let batch: { addr: string; link: boolean; res: (m: string | null) => void }[] = [], bt: ReturnType<typeof setTimeout> | null = null;
  const checkAddr = (addr: string, link: boolean) => new Promise<string | null>((res) => {
    batch.push({ addr, link, res });
    if (!bt) bt = setTimeout(async () => {
      const b = batch; batch = []; bt = null;
      try { const r = await ask({ type: "ca:check", items: b.map((x) => ({ addr: x.addr, link: x.link })) }); for (const x of b) x.res(r[x.addr] ?? null); }
      catch { for (const x of b) x.res(null); }
    }, 200);
  });

  async function resolve(a: HTMLElement) {
    const w = want.get(a);
    if (!w || done.get(a) === w.key) return;
    done.set(a, w.key);
    const found: Found[] = [];
    const add = (mint: string | null, label: string) => { if (mint && !found.some((f) => f.mint === mint) && found.length < 3) found.push({ mint, label }); };
    const checked = await Promise.all([...w.text.map((x) => checkAddr(x, false)), ...w.links.map((x) => checkAddr(x, true))]);
    // one cashtag and one CA in the same tweet: the tag names that CA
    const tag1 = w.tags.length === 1 ? `$${w.tags[0]}` : null;
    checked.forEach((m) => add(m, tag1 && checked.filter(Boolean).length === 1 ? tag1 : short(m ?? "", 4)));
    if (!found.length) for (const t of w.tags.slice(0, 2)) { const r = await ask({ type: "ca:ticker", symbol: t }).catch(() => null); add(r?.mint ?? null, `$${t}`); }
    if (want.get(a)?.key !== w.key) return; // the text changed meanwhile, a newer pass handles it
    render(a, found);
  }

  function render(a: HTMLElement, found: Found[]) {
    let host = a.querySelector<HTMLElement>(`[${HOST}]`);
    if (!found.length || !enabled()) { host?.remove(); return; }
    const row = anchorRow(a, mainText(a));
    if (!row) return;
    if (!host) {
      host = h("div", { [HOST]: "", "data-hb-host": "" });
      host.setAttribute("data-hb-theme", k.theme());
      (host as HTMLElement & { _r?: ShadowRoot })._r = host.attachShadow({ mode: "closed" });
      row.after(host);
    }
    const root = (host as HTMLElement & { _r?: ShadowRoot })._r!;
    const st = h("style"); st.textContent = CA_PILL_CSS;
    root.replaceChildren(st, ...found.map((f) => {
      const b = h("button", { type: "button", title: `Trade ${f.label} · ${f.mint}`, "aria-label": `Open the token popup for ${f.label}`, "data-testid": "hb-ca-btn", "data-mint": f.mint },
        svg(HB_MARK), f.label.startsWith("$") ? f.label : h("span", { class: "mono" }, f.label), svg(ARROW));
      (b.firstChild as HTMLElement).classList.add("hbm");
      b.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); openPopup(f.mint, f.label, b.getBoundingClientRect(), a.getBoundingClientRect()); });
      return b;
    }));
  }

  // Tweets resolve when they come within ~1.5 screens below (or half a screen above) the viewport, so the button is usually in
  // place before the tweet scrolls into view and nothing visible moves.
  const io = new IntersectionObserver((es) => { for (const e of es) if (e.isIntersecting) { io.unobserve(e.target); void resolve(e.target as HTMLElement); } }, { rootMargin: "50% 0px 150% 0px" });
  function scanArticle(a: HTMLElement) {
    if (!enabled()) { a.querySelector(`[${HOST}]`)?.remove(); return; }
    const txt = mainText(a);
    const c = tweetCandidates(txt?.innerText ?? "", linkTexts(a, txt));
    const key = [...c.text, "|", ...c.links, "|", ...c.tags].join(",");
    if (want.get(a)?.key === key) return;
    want.set(a, { ...c, key });
    if (!c.text.length && !c.links.length && !c.tags.length) { a.querySelector(`[${HOST}]`)?.remove(); return; }
    io.observe(a);
  }
  const pending = new Set<HTMLElement>();
  let timer: ReturnType<typeof setTimeout> | null = null;
  const flush = () => { timer = null; const list = [...pending]; pending.clear(); for (const a of list) if (a.isConnected) scanArticle(a); };
  const queue = (a: HTMLElement) => { pending.add(a); if (!timer) timer = setTimeout(flush, 150); };
  const scanAll = () => document.querySelectorAll<HTMLElement>('article[data-testid="tweet"]').forEach(queue);
  // Debounced: X re-renders often (counts, "Show more"), every change in a tweet queues that tweet once per 150 ms.
  new MutationObserver((muts) => {
    for (const m of muts) {
      const t = m.target instanceof HTMLElement ? m.target : m.target.parentElement;
      if (t?.closest?.(`[${HOST}]`)) continue;
      const a = t?.closest?.<HTMLElement>('article[data-testid="tweet"]');
      if (a) queue(a);
      m.addedNodes.forEach((n) => { if (n instanceof HTMLElement && !n.hasAttribute(HOST)) { if (n.matches?.('article[data-testid="tweet"]')) queue(n); else n.querySelectorAll?.<HTMLElement>('article[data-testid="tweet"]').forEach(queue); } });
    }
  }).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  scanAll();

  // ---------------- popup ----------------
  let popHost: HTMLElement | null = null, popCleanup: (() => void) | null = null;
  let savedPos: Pos | null = null;
  void ask({ type: "ca:pos:get" }).then((p) => { savedPos = readPos(p); }).catch(() => {});
  const close = () => { popCleanup?.(); popCleanup = null; popHost?.remove(); popHost = null; };

  function openPopup(mint: string, label: string, anchor: DOMRect | null, tweet: DOMRect | null = null) {
    close();
    k.injectFonts();
    const st = k.status();
    popHost = h("div", { "data-hb-ca-pop": "" });
    const root = popHost.attachShadow({ mode: "closed" });
    const style = h("style"); style.textContent = DRAWER_CSS + CA_CSS;
    let prefs: CaPrefs = { slippagePct: 1, tab: "buy" };
    let info: CaInfo | null = null, presets: number[] = [...DEV_PRESETS_DEFAULT].filter((v) => v > 0);
    let buySol: number | null = null, sellPct: number | null = null, busy = false;

    const wslot = h("span", { class: "wslot" });
    const gearB = h("button", { class: "gearb", type: "button", "aria-haspopup": "dialog", "aria-expanded": "false", title: "Slippage", "data-testid": "hb-ca-slip-btn" });
    const header = h("header", { title: "Drag to move, double click to reset", "data-testid": "hb-ca-head" }, svg(HB_MARK), h("h2", {}, "Trade"), h("span", { style: "flex:1" }), wslot, gearB,
      h("button", { class: "x", type: "button", "aria-label": "Close", onclick: close, html: CLOSE }));
    const body = scrollFade(h("div", { class: "body" }, h("div", { class: "loading" }, `Loading ${label}…`)));
    const foot = h("footer");
    const pop = h("div", { class: "drawer capop", role: "dialog", "aria-modal": "false", "aria-label": `Trade ${label}`, "data-testid": "hb-ca-pop" }, header, body, foot);
    root.append(style, pop);
    for (const ev of ["keydown", "keyup", "keypress"]) pop.addEventListener(ev, (e) => e.stopPropagation());
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && popHost) { e.stopPropagation(); if (!slipPop.hidden) { slipPop.hidden = true; gearB.setAttribute("aria-expanded", "false"); return; } if (sw?.close()) return; close(); } };
    document.addEventListener("keydown", onKey, true);

    // wallets (the drawer's multi select picker and its checked wallets)
    const sw = st?.exists ? k.walletSwitcher(root, st.network, (ws) => { void ask({ type: "drawer:wallets:set", ids: ws.map((w) => w.id) }).catch(() => {}); drawTrade(); }, "Trade wallets") : null;
    if (sw) { wslot.append(sw.btn); root.append(sw.pop); void Promise.all([ask({ type: "wallets:list" }), ask({ type: "drawer:wallets:get" })]).then(([l, d]) => { sw.set(l, d.ids); drawTrade(); void sw.load(true); }).catch(() => {}); }

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
            else if (m.type === "done") { line.classList.add("ok"); s.replaceChildren(`${side === "buy" ? "Bought" : "Sold"}${m.route ? ` via ${m.route}` : ""} · `, h("a", { class: "link", href: m.solscanUrl, target: "_blank", rel: "noopener noreferrer" }, "View tx")); fin(); }
            else { line.classList.add("err"); s.textContent = m.error; fin(); }
          });
          port.onDisconnect.addListener(() => res());
          const msg: SellPortIn = side === "buy" ? { type: "sell", side: "buy", walletId: w.id, mint, pct: 0, sol: a, slippagePct: slip } : { type: "sell", side: "sell", walletId: w.id, mint, pct: a, slippagePct: slip };
          port.postMessage(msg);
        });
      }
      busy = false; sw?.unlock?.(); drawSum(); void sw?.load(true, true);
    });

    // token head, chart, stats
    const chartBox = h("div", { class: "chart", "data-testid": "hb-ca-chart" });
    let chartFor = "";
    const drawChart = () => {
      const pool = info?.pool ?? "";
      if (pool === chartFor) return;
      chartFor = pool;
      if (!pool) { chartBox.replaceChildren(h("div", { class: "empty" }, "No chart yet for this token")); return; }
      const src = chrome.runtime.getURL(`chart.html?pool=${encodeURIComponent(pool)}&theme=dark`);
      chartBox.replaceChildren(h("iframe", { src, title: `${sym()} chart`, loading: "lazy", referrerpolicy: "no-referrer", "data-testid": "hb-ca-chart-frame" }));
    };
    const head = h("div", { class: "tok" }), stats = h("div", { class: "stats" });
    const drawInfo = () => {
      if (!info) return;
      const logo = info.image ? h("img", { class: "tlogo", src: info.image, alt: "" }) : h("span", { class: "tlogo", "aria-hidden": "true" }, (info.symbol || "?").slice(0, 1).toUpperCase());
      if (logo instanceof HTMLImageElement) logo.addEventListener("error", () => logo.replaceWith(h("span", { class: "tlogo" }, (info?.symbol || "?").slice(0, 1).toUpperCase())));
      const chg = info.change24h;
      head.replaceChildren(logo,
        h("div", { class: "tname" }, h("div", { class: "tn1" }, h("span", { class: "nm", title: info.name }, info.name), info.verified ? svg(VERIFIED) : null, h("span", { class: "tsym" }, `$${info.symbol}`)), k.caLine(mint, true)),
        h("div", { class: "tprice", "data-testid": "hb-ca-price" }, h("span", { class: "p" }, fmtUsdPrice(info.priceUsd)), h("span", { class: `chg ${chg === null ? "flat" : chg > 0 ? "up" : chg < 0 ? "dn" : "flat"}`, title: "24h change" }, fmtChange(chg))));
      const stat = (kk: string, v: string) => h("div", { class: "stat" }, h("span", { class: "k" }, kk), h("span", { class: "v" }, v));
      stats.replaceChildren(stat("Market cap", fmtUsdCompact(info.mcapUsd)), stat("Vol 24h", fmtUsdCompact(info.volume24hUsd)), stat("Liquidity", fmtUsdCompact(info.liquidityUsd)));
      drawChart(); drawSum();
    };
    const build = () => {
      body.replaceChildren(head, chartBox, stats, sideSeg, amts, sum, runs);
      foot.replaceChildren(cta, h("div", { class: "verify" }, k.terminalRow(mint, info?.tokenUrl ?? null, true), h("span", {}, "Always verify the contract address")));
      drawInfo(); drawTrade();
    };
    const load = async (fresh: boolean) => {
      try { info = await ask({ type: "ca:info", mint, fresh }); if (!head.isConnected) build(); else drawInfo(); }
      catch (e) { if (!info) body.replaceChildren(h("div", { class: "result" }, h("strong", {}, "No market data"), h("span", { class: "muted" }, `${(e as Error).message || "Could not load this token"}. CA ${mint}`)), k.terminalRow(mint, null)); }
    };
    void Promise.all([ask({ type: "ca:prefs:get" }).then((p) => { prefs = p; }).catch(() => {}), ask({ type: "drawer:devpresets:get" }).then((r) => { const v = r.values.filter((x) => x > 0 && x <= BUY_MAX_SOL); if (v.length) presets = v; }).catch(() => {})])
      .then(() => { drawSlip(); if (info) drawTrade(); });
    drawSlip();
    void load(false);
    const poll = setInterval(() => { if (document.visibilityState === "visible") void load(true); }, 15_000);

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
    apply(savedPos ?? near());
    const ro = new ResizeObserver(() => apply(pos)); ro.observe(pop);
    const onResize = () => apply(pos); addEventListener("resize", onResize);
    let drag: { id: number; dx: number; dy: number } | null = null;
    header.addEventListener("pointerdown", (e) => { if (e.button !== 0 || (e.target as Element).closest("button")) return; e.preventDefault(); drag = { id: e.pointerId, dx: e.clientX - pos.left, dy: e.clientY - pos.top }; header.setPointerCapture(e.pointerId); pop.classList.add("dragging", "moved"); });
    header.addEventListener("pointermove", (e) => { if (drag && e.pointerId === drag.id) apply({ left: e.clientX - drag.dx, top: e.clientY - drag.dy }); });
    const end = (e: PointerEvent) => { if (!drag || e.pointerId !== drag.id) return; drag = null; pop.classList.remove("dragging"); savedPos = { ...pos }; void ask({ type: "ca:pos:set", pos: savedPos }).catch(() => {}); };
    header.addEventListener("pointerup", end); header.addEventListener("pointercancel", end);
    header.addEventListener("dblclick", (e) => { if ((e.target as Element).closest("button")) return; savedPos = null; void ask({ type: "ca:pos:set", pos: null }).catch(() => {}); apply(near()); });
    popCleanup = () => { clearInterval(poll); ro.disconnect(); removeEventListener("resize", onResize); document.removeEventListener("keydown", onKey, true); };
  }

  return {
    /** Settings changed (Token detection on or off): rescan every tweet. */
    refresh() { document.querySelectorAll<HTMLElement>('article[data-testid="tweet"]').forEach((a) => { want.delete(a); done.delete(a); }); scanAll(); },
    theme(t: "light" | "dark") { document.querySelectorAll<HTMLElement>(`[${HOST}]`).forEach((el) => el.setAttribute("data-hb-theme", t)); },
    open: openPopup,
  };
}
