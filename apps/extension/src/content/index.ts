/** x.com content script: a "Launch" button in every tweet's action bar and the quick launch drawer.
 *  It never sees keys or signs: wallet state, quotes and the launch itself go through the background worker. */
import { draftFromTweet, NAME_MAX_BYTES, normalizeXLink, readTweet, TICKER_MAX_BYTES, type LaunchDraft, type TweetInfo } from "../lib/tweet";
import type { LaunchOpts, LaunchPortIn, LaunchPortOut, LaunchStep, ToContent, WalletRow, WalletStatus } from "../lib/messages";
import { adoptCss, ask, h, onIdle, scrollFade, svg } from "./dom";
import { holdingPanel, type HoldingPanel } from "./holding";
import { initCa } from "./ca";
import { LAUNCH_TIERS, TIER_LABEL, type LaunchTier } from "../lib/settings";
import { clampPos, placeNear, readPos, type Box, type Pos } from "../lib/place";
import { fmtSol, short } from "../lib/format";
import { CHECK, CLOSE, COPY, GEAR, HB_MARK, INFO, SOL_MARK, X_MARK, METEORA_MARK } from "../lib/icons";
import { DEV_BUY_MAX, DEV_PRESETS_DEFAULT, DEV_PRESETS_MAX, checkDevPresets } from "../lib/devpresets";
import { terminalLinks } from "../lib/terminals";
import { BUTTON_CSS, DRAWER_CSS } from "./styles";
import { isShort, launchNeedSol, MULTI_MAX, toggleChecked, type MultiRow } from "../lib/multi";
import { notice, pickNotice, walletNotice, type Notice } from "../lib/notice";
import { playSfx, primeSfx } from "../lib/sfx";

const MARK = "data-hb-launch";
let status: WalletStatus | null = null;

async function refresh() { try { status = await ask({ type: "status" }); } catch { status = null; } for (const f of buttonUpdaters) f(); }

const bytes = (s: string) => new TextEncoder().encode(s).length;

let tipSeq = 0;
/** An info icon with a small tooltip (11px, at most 220 wide). It is fixed positioned so the scroll area never clips it, and
 *  placed where it covers no input field: above the icon, else below, else beside the window (left, then right), else wherever it
 *  covers the fewest. Inside the drawer it is clamped to the drawer edges. */
function tip(text: string) {
  const id = `hbtip${++tipSeq}`;
  const panel = h("span", { class: "tpanel", role: "tooltip", id }, text);
  const el = h("span", { class: "tip", tabindex: 0, role: "button", "aria-label": "More info", "aria-describedby": id }, svg(INFO));
  const show = () => {
    const rn = el.getRootNode();
    if (rn instanceof ShadowRoot && panel.parentNode !== rn) rn.append(panel); // at the root: no scroll area mask or clip applies
    el.classList.add("show"); panel.classList.add("on");
    const drawer = el.closest(".drawer") as HTMLElement | null, rootNode = el.getRootNode() as ShadowRoot;
    const r = el.getBoundingClientRect(), d = drawer?.getBoundingClientRect() ?? new DOMRect(0, 0, innerWidth, innerHeight);
    const frame = rootNode.querySelector?.(".hframe:not([hidden])") as HTMLElement | null, win = frame?.getBoundingClientRect() ?? d;
    const pw = panel.offsetWidth, ph = panel.offsetHeight, gap = 6, vw = document.documentElement.clientWidth || innerWidth;
    const fields = drawer ? [...drawer.querySelectorAll<HTMLElement>(".body input:not([type=file]),.body textarea")].filter((x) => x.offsetParent).map((x) => x.getBoundingClientRect()) : [];
    const covers = (x: number, y: number) => fields.filter((b) => b.bottom > y && b.top < y + ph && b.right > x && b.left < x + pw).length;
    const cx = Math.max(d.left + 6, Math.min(r.left + r.width / 2 - pw / 2, d.right - 6 - pw));
    const sy = Math.max(4, Math.min(r.top + r.height / 2 - ph / 2, innerHeight - 4 - ph));
    const opts: [number, number][] = [];
    if (r.top - gap - ph >= 4) opts.push([cx, r.top - gap - ph]);
    if (r.bottom + gap + ph <= innerHeight - 4) opts.push([cx, r.bottom + gap]);
    const free = opts.find(([x, y]) => covers(x, y) === 0)
      ?? (win.left - gap - pw >= 4 ? [win.left - gap - pw, sy] as [number, number] : undefined)
      ?? (win.right + gap + pw <= vw - 4 ? [win.right + gap, sy] as [number, number] : undefined)
      ?? opts.sort((p, q) => covers(...p) - covers(...q))[0] ?? [cx, r.bottom + gap];
    panel.style.left = `${Math.round(free[0])}px`; panel.style.top = `${Math.round(free[1])}px`;
  };
  const hide = () => { el.classList.remove("show"); panel.classList.remove("on"); };
  el.addEventListener("pointerenter", show); el.addEventListener("pointerleave", () => { if (!el.matches(":focus")) hide(); });
  el.addEventListener("focus", show); el.addEventListener("blur", hide);
  return el;
}

// ---- fonts (declared on the page so the shadow roots can use them; files are web accessible) ----
function injectFonts() {
  if (document.getElementById("hb-ext-fonts")) return;
  const f = (fam: string, file: string, w: number) => `@font-face{font-family:"${fam}";src:url(${chrome.runtime.getURL(`fonts/${file}`)}) format("woff2");font-weight:${w};font-display:swap}`;
  const st = document.createElement("style");
  st.id = "hb-ext-fonts";
  st.textContent = [f("HB Inter", "inter-400.woff2", 400), f("HB Inter", "inter-500.woff2", 500), f("HB Inter", "inter-600.woff2", 600), f("HB Cinzel", "cinzel-600.woff2", 600), f("HB Mono", "mono-400.woff2", 400), f("HB Mono", "mono-500.woff2", 500), f("HB Mono", "mono-500.woff2", 600)].join("");
  (document.head ?? document.documentElement).append(st);
}

// ---- tweet buttons ----
const buttonUpdaters = new Set<() => void>();
function instantOn() { return !!(status?.ready && status.presets.instant); }

/** x.com theme from the page background: "light" for Default, "dark" for Dim and Lights out. */
function xTheme(): "light" | "dark" {
  const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(getComputedStyle(document.body ?? document.documentElement).backgroundColor);
  if (!m) return "dark";
  const [r, g, b] = [m[1], m[2], m[3]].map(Number);
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b! > 140 ? "light" : "dark";
}
/** True when the action row's items no longer fit (their boxes, not hover circles that X draws past the edges). */
function overflows(bar: HTMLElement): boolean {
  const right = bar.getBoundingClientRect().right;
  return [...bar.children].some((c) => c.getBoundingClientRect().right > right + 1);
}
/** X sets its font on the text spans, not on the row, so inheriting gives the page default (a serif). Copy it from a native count. */
const X_FONT = 'TwitterChirp, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
let fontCache = "";
function nativeFont(bar: HTMLElement): string {
  if (fontCache) return fontCache; // read once: getComputedStyle per tweet forced a style recalc while scrolling
  const el = bar.querySelector<HTMLElement>('[data-testid="like"] span, [data-testid="reply"] span, [data-testid="retweet"] span, span');
  const f = el ? getComputedStyle(el).fontFamily : "";
  if (f && !/^(serif|"?Times)/i.test(f)) { fontCache = f; return f; }
  return X_FONT;
}
let lastTheme = "";
/** The current theme, cached (computed style is read only when x.com restyles html or body, not once per tweet). */
let curTheme: "light" | "dark" | null = null;
const theme = () => (curTheme ??= xTheme());
function syncTheme() {
  const t = xTheme(); curTheme = t; if (t === lastTheme) return; lastTheme = t;
  document.querySelectorAll<HTMLElement>("[data-hb-host]").forEach((el) => el.setAttribute("data-hb-theme", t));
}

/** Tweets that already have their button (cheaper than an attribute read, and forgets removed tweets by itself). */
const processed = new WeakSet<HTMLElement>();
/** One ResizeObserver for every action row (instead of one per tweet); its callback runs after layout, so fit() reads are cheap. */
const fits = new WeakMap<Element, () => void>();
const fitRO = new ResizeObserver((es) => { for (const e of es) fits.get(e.target)?.(); });

function addButton(article: HTMLElement) {
  if (processed.has(article)) return;
  if (article.hasAttribute(MARK)) { processed.add(article); return; }
  const groups = article.querySelectorAll<HTMLElement>('[role="group"]');
  const bar = [...groups].reverse().find((g) => g.querySelector('[data-testid="reply"],[data-testid="like"],[data-testid="retweet"]')) ?? groups[groups.length - 1];
  if (!bar || bar.closest("article") !== article) return;
  article.setAttribute(MARK, ""); processed.add(article);
  const host = h("span", { "data-hb-host": "", "data-hb-theme": theme() });
  host.style.display = "inline-flex"; host.style.alignItems = "center"; host.style.fontFamily = nativeFont(bar);
  const root = host.attachShadow({ mode: "closed" });
  const btn = h("button", { type: "button", "data-testid": "hb-launch-button" });
  const update = () => {
    const inst = instantOn();
    btn.className = inst ? "instant" : "";
    btn.replaceChildren(svg(HB_MARK), h("span", { class: "lbl" }, "Launch"));
    if (inst) btn.append(h("span", { class: "amt", html: SOL_MARK }, fmtSol(status!.presets.devBuySol)));
    btn.title = inst ? `Instant launch with presets. Dev buy ${fmtSol(status!.presets.devBuySol)} SOL. Shift click to review first.` : "Launch on highbar";
    btn.setAttribute("aria-label", btn.title);
  };
  update();
  const upd = () => { if (!host.isConnected) { buttonUpdaters.delete(upd); fits.delete(bar); fitRO.unobserve(bar); return; } update(); fit(); };
  buttonUpdaters.add(upd);
  btn.addEventListener("click", (e) => {
    e.preventDefault(); e.stopPropagation();
    if (!e.isTrusted) return; // only a real user click, never a script on the page
    const t = readTweet(article);
    if (t) openDrawer(t, { instant: instantOn() && !e.shiftKey, anchor: btn.getBoundingClientRect() });
  });
  root.append(btn); adoptCss(root, BUTTON_CSS);
  // Before the bookmark and share block so the share icon stays at the end of the row
  const end = [...bar.children].find((c) => c.querySelector('[data-testid="bookmark"],[data-testid="removeBookmark"]') || (c.querySelector('[aria-label*="Share"],[data-testid="share"]') && !c.querySelector('[data-testid="like"],[data-testid="unlike"]')));
  if (end) bar.insertBefore(host, end); else bar.append(host);
  // Narrow tweets (replies, small windows): the logo alone, so nothing wraps or pushes the share icon out
  // full pill, then the logo in a small pill, then the bare logo for the tightest rows
  function fit() {
    host.removeAttribute("data-compact"); host.removeAttribute("data-mini");
    if (bar.clientWidth >= 400 && !overflows(bar)) return;
    host.setAttribute("data-compact", "");
    if (overflows(bar)) host.setAttribute("data-mini", "");
  }
  fits.set(bar, fit); fitRO.observe(bar); // observe() reports the first size right after layout: that is the first fit
}

function scan(root: ParentNode = document) { root.querySelectorAll<HTMLElement>('article[data-testid="tweet"]').forEach(addButton); }

let hovered: HTMLElement | null = null;
document.addEventListener("mouseover", (e) => { const a = (e.target as Element | null)?.closest?.('article[data-testid="tweet"]'); if (a) hovered = a as HTMLElement; }, { passive: true });
/** Alt+L target: the tweet under the mouse, else the first one in view (an open status page puts its tweet first). */
function hotkeyTweet(): { t: TweetInfo; a: HTMLElement } | null {
  const vis = (a: Element) => { const r = a.getBoundingClientRect(); return r.bottom > 60 && r.top < innerHeight - 60; };
  const list = [...document.querySelectorAll<HTMLElement>('article[data-testid="tweet"]')];
  const a = (hovered && document.contains(hovered) && vis(hovered) ? hovered : null) ?? list.find(vis);
  const t = a ? readTweet(a) : null;
  return t && a ? { t, a } : null;
}

// ---- drawer ----
let drawerHost: HTMLElement | null = null;
const STEPS: { id: LaunchStep; label: string }[] = [
  { id: "image", label: "Preparing the image" }, { id: "metadata", label: "Uploading metadata" }, { id: "mint", label: "Building the launch" },
  { id: "sign", label: "Signing in the extension" }, { id: "cosign", label: "Adding the mint signature" }, { id: "send", label: "Sending" }, { id: "confirm", label: "Confirming on Solana" },
];

let drawerCleanup: (() => void) | null = null;
let holding: HoldingPanel | null = null;
function closeDrawer() { escHook = null; holding?.destroy(); holding = null; drawerCleanup?.(); drawerCleanup = null; drawerHost?.remove(); drawerHost = null; document.removeEventListener("keydown", onEsc, true); }

/** Last dragged spot for this browser session (kept by the worker in chrome.storage.session). */
let savedPos: Pos | null = null;
void ask({ type: "drawer:pos:get" }).then((p) => { savedPos = readPos(p); }).catch(() => {});

/** Places the drawer next to its button (or the saved spot), keeps it in the viewport and lets the header drag it. No overlay: the page still scrolls and takes clicks.
 *  With the Holding panel open the two are one window: the clamp covers both, and the panel header drags it too. */
function placeDrawer(drawer: HTMLElement, heads: HTMLElement[], anchor: Box | null) {
  const vp = () => ({ w: document.documentElement.clientWidth || innerWidth, h: innerHeight });
  const size = () => { const r = drawer.getBoundingClientRect(); return { w: r.width, h: r.height }; };
  let pos: Pos = { left: 0, top: 0 };
  const apply = (p: Pos) => {
    const e = holding?.extent() ?? { l: 0, r: 0 }, s = size();
    const c = clampPos({ left: p.left - e.l, top: p.top }, { w: s.w + e.l + e.r, h: s.h }, vp());
    pos = { left: c.left + e.l, top: c.top };
    drawer.style.left = `${pos.left}px`; drawer.style.top = `${pos.top}px`; holding?.sync();
  };
  const home = () => apply(savedPos ?? placeNear(anchor, size(), vp()));
  home();
  // Content grows (quote, steps, errors): stay inside the viewport
  const ro = new ResizeObserver(() => apply(pos)); ro.observe(drawer);
  const onResize = () => apply(pos); addEventListener("resize", onResize);
  drawer.addEventListener("hb:layout", () => apply(pos)); // the Holding panel opened or closed

  let drag: { id: number; dx: number; dy: number; el: HTMLElement } | null = null;
  for (const header of heads) {
    header.addEventListener("pointerdown", (e) => {
      if (e.button !== 0 || (e.target as Element).closest("button")) return;
      e.preventDefault();
      drag = { id: e.pointerId, dx: e.clientX - pos.left, dy: e.clientY - pos.top, el: header };
      header.setPointerCapture(e.pointerId); drawer.classList.add("dragging", "moved");
    });
    header.addEventListener("pointermove", (e) => { if (drag && drag.el === header && e.pointerId === drag.id) apply({ left: e.clientX - drag.dx, top: e.clientY - drag.dy }); });
    const end = (e: PointerEvent) => {
      if (!drag || drag.el !== header || e.pointerId !== drag.id) return;
      drag = null; drawer.classList.remove("dragging");
      if (header.hasPointerCapture(e.pointerId)) header.releasePointerCapture(e.pointerId);
      savedPos = { ...pos }; void ask({ type: "drawer:pos:set", pos: savedPos }).catch(() => {});
    };
    header.addEventListener("pointerup", end); header.addEventListener("pointercancel", end);
    // Double click a header: back next to the button, and forget the dragged spot
    header.addEventListener("dblclick", (e) => {
      if ((e.target as Element).closest("button")) return;
      savedPos = null; void ask({ type: "drawer:pos:set", pos: null }).catch(() => {});
      apply(placeNear(anchor, size(), vp()));
    });
  }
  drawerCleanup = () => { ro.disconnect(); removeEventListener("resize", onResize); };
}

/** The Launch button of a tweet, for the Alt+L drawer to open next to. */
function buttonBox(article: HTMLElement): Box | null {
  const host = article.querySelector<HTMLElement>("[data-hb-host]");
  if (!host) return null;
  const r = host.getBoundingClientRect();
  return r.width && r.bottom > 0 && r.top < innerHeight ? r : null;
}
/** An open popover inside the drawer (the wallet picker) closes first on Escape. */
let escHook: (() => boolean) | null = null;
function onEsc(e: KeyboardEvent) { if (e.key === "Escape" && drawerHost) { e.stopPropagation(); if (escHook?.()) return; closeDrawer(); } }

/** The tweet the drawer was opened for, so Close after a launch can bring back a fresh form for it. */
let lastTweet: TweetInfo | null = null, lastAnchor: Box | null = null;
const backToForm = () => { if (lastTweet) void refresh().catch(() => {}).finally(() => { if (lastTweet) openDrawer(lastTweet, { instant: false, anchor: lastAnchor }); }); else closeDrawer(); };

/** Short CA with a copy button. */
function caLine(mint: string, compact = false) {
  const b = h("button", { class: "cacopy", type: "button", title: "Copy CA", "aria-label": "Copy the token address", html: COPY, "data-testid": "hb-ca-copy" });
  b.addEventListener("click", (e) => { e.stopPropagation(); void navigator.clipboard?.writeText(mint).then(() => { b.classList.add("done"); b.title = "Copied"; setTimeout(() => { b.classList.remove("done"); b.title = "Copy CA"; }, 1200); }).catch(() => {}); });
  return h("span", { class: `ca${compact ? " sm" : ""}`, title: mint, "data-testid": "hb-ca" }, compact ? null : h("span", { class: "calbl" }, "CA"), h("span", { class: "mono" }, short(mint, 4)), b);
}
/** One row of terminal icons (bundled PNGs), the name on hover. Telegram bots copy the CA first. */
function terminalRow(mint: string, tokenUrl: string | null | undefined, iconOnly = false) {
  return h("span", { class: `terms${iconOnly ? " sm" : ""}`, role: "group", "aria-label": "Open in a terminal", "data-testid": "hb-terminals" },
    ...terminalLinks(mint, tokenUrl).map((x) => {
      const a = h("a", { class: "term", href: x.url, target: "_blank", rel: "noopener noreferrer", title: x.title, "aria-label": x.name, "data-term": x.id },
        h("img", { src: chrome.runtime.getURL(x.icon), alt: "", width: iconOnly ? "16" : "18", height: iconOnly ? "16" : "18" }));
      if (x.copyCa) a.addEventListener("click", () => { void navigator.clipboard?.writeText(mint).catch(() => {}); });
      return a;
    }));
}

function openDrawer(t: TweetInfo, { instant, anchor = null }: { instant: boolean; anchor?: Box | null }) {
  closeDrawer();
  lastTweet = t; lastAnchor = anchor;
  injectFonts();
  const st = status;
  const p = st?.presets;
  const draft: LaunchDraft = draftFromTweet(t);
  const state = {
    name: draft.name, ticker: draft.ticker, description: p && !p.useTweetText && p.description ? p.description : draft.description || p?.description || "",
    image: draft.imageUrl, upload: null as string | null, xLink: t.url,
    tier: (p?.tier ?? "standard") as LaunchTier, antiSniper: p?.antiSniper ?? false, devBuySol: p?.devBuySol ?? 0, slippageBps: p?.slippageBps ?? 100,
  };
  drawerHost = h("div", { "data-hb-drawer": "" });
  const root = drawerHost.attachShadow({ mode: "closed" });
  const style = h("style"); style.textContent = DRAWER_CSS;
  const body = scrollFade(h("div", { class: "body" }));
  const foot = h("footer");
  const wslot = h("span", { class: "wslot" });
  const dotState = !st?.exists ? "none" : st.ready ? "on" : "off";
  const dot = h("span", { class: `wdot ${dotState}`, title: dotState === "on" ? `Wallet ${short(st!.address ?? "", 4)}` : dotState === "off" ? "Wallet update pending" : "No wallet", "aria-label": dotState === "on" ? "Wallet ready" : dotState === "off" ? "Wallet update pending" : "No wallet" });
  const hslot = h("span", { class: "hslot" });
  const header = h("header", { title: "Drag to move, double click to reset", "data-testid": "hb-drawer-head" }, svg(HB_MARK), h("h2", {}, instant ? "Instant launch" : "Launch"), dot, h("span", { style: "flex:1" }), hslot, wslot, h("button", { class: "x", "aria-label": "Close", onclick: closeDrawer, html: CLOSE }));
  const drawer = h("div", { class: "drawer", role: "dialog", "aria-modal": "false", "aria-label": "Launch on highbar", "data-testid": "hb-drawer" }, header, body, foot);
  root.append(style, drawer);
  const sw = st?.exists ? walletSwitcher(root, st.network, (ws) => { setDot(ws); ask({ type: "drawer:wallets:set", ids: ws.map((w) => w.id) }).catch(() => {}); onWallet?.(); holding?.walletsChanged(); }) : null;
  let onWallet: (() => void) | null = null;
  if (sw) { wslot.append(sw.btn); root.append(sw.pop); escHook = () => (holding?.closePop() ?? false) || sw.close(); }
  // Holding panel (tokens these wallets launched or hold, quick sell): attached to the drawer as one window
  if (sw && !(st?.needsMigration && st.walletCount <= 1)) { holding = holdingPanel(root, drawer, () => sw.get()); hslot.append(holding.btn); }
  document.documentElement.append(drawerHost);
  queueMicrotask(() => { if (drawer.isConnected) placeDrawer(drawer, holding ? [header, holding.head] : [header], anchor); }); // once the body below has rendered, so the height is real
  document.addEventListener("keydown", onEsc, true);
  for (const ev of ["keydown", "keyup", "keypress"]) drawer.addEventListener(ev, (e) => e.stopPropagation()); // x.com hotkeys stay out of the fields

  if (!st || !st.exists) return renderGate(body, foot, "No wallet yet", "Create or import a dedicated launch wallet in the highbar side panel first.", "Open side panel", () => ask({ type: "open:sidepanel" }));
  if (st.needsMigration && st.walletCount <= 1) return renderGate(body, foot, "Finish the wallet update", "Open the highbar side panel and enter your old wallet password once. The wallet does not lock after that.", "Open side panel", () => ask({ type: "open:sidepanel" }));
  function setDot(ws: WalletRow[]) {
    if (!ws.length) return;
    dot.className = `wdot ${ws.some((w) => w.needsMigration) ? "off" : "on"}`;
    dot.title = ws.length > 1 ? `${ws.length} wallets checked` : `${ws[0].label} ${short(ws[0].address, 4)}`;
  }
  // The wallets checked here (the active one until a pick). Labels first, balances right after (one RPC read per
  // wallet, cached a few seconds by the worker).
  const picked = Promise.all([ask({ type: "wallets:list" }), ask({ type: "drawer:wallets:get" })]).then(([list, d]) => {
    const ws = sw!.set(list, d.ids); setDot(ws); holding?.walletsChanged();
    void sw!.load(true);
    return ws;
  });
  if (instant) {
    // Instant: launches right away with the checked wallets (one token each), shown in the header and the progress view
    sw!.lock();
    body.replaceChildren(h("div", { class: "muted" }, "Starting…"));
    void picked.then((ws) => { if (!drawerHost || !body.isConnected) return; if (ws.length > 1) runLaunchMulti(body, foot, state, true, ws); else runLaunch(body, foot, state, true, ws[0] ?? null); })
      .catch((e) => renderGate(body, foot, "Could not start", (e as Error).message, "Close", async () => closeDrawer()));
    return;
  }
  renderForm(body, foot, state, st, t, sw!, picked, (f) => { onWallet = f; });
}

function poweredBy() {
  return h("a", { class: "powered", href: "https://meteora.ag", target: "_blank", rel: "noopener noreferrer", "data-testid": "hb-powered" }, "Powered by", svg(METEORA_MARK), "Meteora");
}

function renderGate(body: HTMLElement, foot: HTMLElement, title: string, text: string, cta: string, act: () => Promise<unknown>) {
  body.replaceChildren(h("div", { class: "result" }, h("strong", {}, title), h("span", { class: "muted" }, text)));
  foot.replaceChildren(h("button", { class: "cta", onclick: () => { act().catch(() => {}); } }, cta));
}

type DrawerState = { name: string; ticker: string; description: string; image: string | null; upload: string | null; xLink: string; tier: LaunchTier; antiSniper: boolean; devBuySol: number; slippageBps: number };

const WALLET_ICON = `<svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true" focusable="false"><path d="M2.5 4.75A1.75 1.75 0 0 1 4.25 3h7.5v2.25" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><rect x="2.5" y="5.25" width="11" height="7.75" rx="1.6" stroke="currentColor" stroke-width="1.3"/><circle cx="10.6" cy="9.1" r=".95" fill="currentColor"/></svg>`;
const REFRESH_ICON = `<svg viewBox="0 0 16 16" width="13" height="13" fill="none" aria-hidden="true" focusable="false"><path d="M13 8a5 5 0 1 1-1.46-3.54" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><path d="M13 2.75V5.5h-2.75" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const COPY_ICON = `<svg viewBox="0 0 16 16" width="11" height="11" fill="none" aria-hidden="true" focusable="false"><rect x="5.25" y="5.25" width="8" height="8" rx="1.5" stroke="currentColor" stroke-width="1.3"/><path d="M10.75 3.25A1.5 1.5 0 0 0 9.25 2h-5.5a1.5 1.5 0 0 0-1.5 1.5v5.5a1.5 1.5 0 0 0 1.25 1.48" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`;

/** The wallet switcher in the drawer header: closed it shows a wallet icon, the count when more than one is checked, the SOL
 *  (the one wallet's, or the total of the checked ones) and a chevron. It opens a dropdown under itself (position fixed inside
 *  the drawer's shadow root, so the drawer never clips it). Multi select, at least one stays checked: every checked wallet
 *  creates its own token. Only labels, addresses and balances come from the worker, never key material. */
function walletSwitcher(root: ShadowRoot, network: WalletStatus["network"], onChange: (checked: WalletRow[]) => void, label = "Launch wallets") {
  let rows: WalletRow[] = [];
  let checked: string[] = [];
  let need: number | null = null;
  let locked = false;
  const btn = h("button", { class: "wsw", type: "button", "aria-haspopup": "listbox", "aria-expanded": "false", "aria-label": label, "data-testid": "hb-wallet-pick" });
  const list = h("div", { class: "wlist", role: "listbox", "aria-multiselectable": "true", "aria-label": "Check the launch wallets" });
  const refreshBtn = h("button", { class: "wref", type: "button", "aria-label": "Refresh balances", title: "Refresh balances", html: REFRESH_ICON, "data-testid": "hb-wallet-refresh" });
  const hint = h("div", { class: "whint" });
  const pop = h("div", { class: "wdrop", hidden: true, "data-testid": "hb-wallet-list" },
    h("div", { class: "wtitle" }, h("span", { class: "wico", html: WALLET_ICON }), h("span", {}, "Wallet"), refreshBtn, h("span", { style: "flex:1" }),
      network === "devnet" ? h("span", { class: "wnet", title: "highbar is on Solana devnet" }, "Devnet") : null),
    list, hint);
  const bal = (w: WalletRow | null) => (w?.sol == null ? "–" : fmtSol(w.sol));
  const cur = () => rows.filter((w) => checked.includes(w.id));
  const place = () => {
    const r = btn.getBoundingClientRect(), w = 260;
    pop.style.top = `${Math.round(r.bottom + 6)}px`;
    pop.style.left = `${Math.round(Math.max(8, Math.min(r.right - w, innerWidth - w - 8)))}px`;
    pop.style.maxHeight = `${Math.max(140, Math.round(innerHeight - r.bottom - 16))}px`;
  };
  const close = () => { if (pop.hidden) return false; pop.hidden = true; btn.setAttribute("aria-expanded", "false"); return true; };
  const open = () => { if (locked || !rows.length) return; place(); pop.hidden = false; btn.setAttribute("aria-expanded", "true"); (list.querySelector(".wrow.on") as HTMLElement | null)?.focus(); };
  const drawBtn = () => {
    const c = cur(), many = c.length > 1;
    const known = c.filter((w) => w.sol != null), total = known.reduce((a, w) => a + (w.sol ?? 0), 0);
    const solText = many ? (known.length ? fmtSol(Math.round(total * 1e4) / 1e4) : "–") : bal(c[0] ?? null);
    btn.replaceChildren(h("span", { class: "wico", html: WALLET_ICON }), ...(many ? [h("span", { class: "wcount", "data-testid": "hb-wallet-count" }, String(c.length))] : []),
      h("span", { class: "wbal" }, svg(SOL_MARK), solText), ...(locked ? [] : [h("span", { class: "chev" })]));
    btn.title = many ? `${c.length} wallets checked, one token each · ${solText} SOL in total` : c[0] ? `${c[0].label} ${c[0].address}${c[0].sol != null ? ` · ${fmtSol(c[0].sol)} SOL` : ""}` : "Wallet";
    (btn as HTMLButtonElement).disabled = locked;
  };
  const copyBtn = (a: string) => {
    const b = h("button", { class: "wcopy", type: "button", "aria-label": "Copy address", title: "Copy address", html: COPY_ICON });
    b.addEventListener("click", (e) => { e.stopPropagation(); void navigator.clipboard?.writeText(a).then(() => { b.classList.add("done"); setTimeout(() => b.classList.remove("done"), 1200); }).catch(() => {}); });
    return b;
  };
  const drawList = () => {
    list.replaceChildren(...rows.map((w) => {
      const on = checked.includes(w.id), low = need !== null && isShort(w.sol, need);
      const row = h("div", { class: `wrow${on ? " on" : ""}${low ? " low" : ""}`, role: "option", tabindex: "0", "aria-selected": String(on), "data-wallet": w.id, title: w.address },
        h("span", { class: "wchk" }), h("span", { class: "wico", html: WALLET_ICON }),
        h("span", { class: "wtxt" }, h("span", { class: "wlab" }, w.label, w.needsMigration ? h("span", { class: "pend" }, "update pending") : null),
          h("span", { class: "waddr" }, short(w.address, 4), copyBtn(w.address), low ? h("span", { class: "wlow", "data-testid": "hb-wallet-low", title: "Not enough SOL for this launch" }, "Low SOL") : null)),
        h("span", { class: "wbal" }, svg(SOL_MARK), bal(w)));
      const flip = () => {
        if (!on && checked.length >= MULTI_MAX) { hint.textContent = `Up to ${MULTI_MAX} wallets at once`; return; }
        const next = toggleChecked(checked, w.id, rows.map((x) => x.id));
        if (next === checked) { hint.textContent = "Keep at least one wallet checked"; return; }
        hint.textContent = ""; checked = next; drawBtn(); drawList(); onChange(cur());
        (list.querySelector(`[data-wallet="${w.id}"]`) as HTMLElement | null)?.focus();
      };
      row.addEventListener("click", flip);
      row.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flip(); } });
      return row;
    }));
  };
  btn.addEventListener("click", () => (pop.hidden ? open() : close()));
  const load = async (balances: boolean, fresh = false) => {
    refreshBtn.classList.toggle("spin", balances);
    try { const full = await ask({ type: "wallets:list", balances, fresh }); api.set(full, checked); onChange(cur()); } catch { /* keeps the last list */ }
    finally { refreshBtn.classList.remove("spin"); }
  };
  refreshBtn.addEventListener("click", (e) => { e.stopPropagation(); void load(true, true); });
  // Outside clicks close it: inside the shadow root anything but the button and the dropdown, and anywhere on the page
  root.addEventListener("pointerdown", (e) => { const t = e.target as Node; if (!pop.contains(t) && !btn.contains(t)) close(); }, true);
  const onDoc = (e: Event) => { if (!pop.isConnected) { document.removeEventListener("pointerdown", onDoc, true); removeEventListener("resize", onResize); return; } if (e.target !== root.host) close(); };
  const onResize = () => close();
  document.addEventListener("pointerdown", onDoc, true);
  addEventListener("resize", onResize);
  const api = {
    btn, pop, close, load,
    set(next: WalletRow[], ids: string[]) {
      rows = next;
      const keep = next.filter((w) => ids.includes(w.id)).map((w) => w.id);
      checked = keep.length ? keep : [(next.find((w) => w.active) ?? next[0])?.id].filter((x): x is string => !!x);
      drawBtn(); drawList();
      return cur();
    },
    /** The checked wallets, in list order. */
    get: () => cur(),
    /** SOL one launch needs per wallet (flags the wallets below it). */
    setNeed(n: number | null) { need = n; drawList(); },
    /** While a launch runs the wallets cannot change. */
    lock() { locked = true; close(); drawBtn(); },
    unlock() { locked = false; drawBtn(); },
  };
  drawBtn();
  return api;
}
type Switcher = ReturnType<typeof walletSwitcher>;

function renderForm(body: HTMLElement, foot: HTMLElement, s: DrawerState, _st: WalletStatus, t: TweetInfo, picker: Switcher, picked: Promise<unknown>, onWallet: (f: () => void) => void) {
  let imgErr: Notice | null = null, current: Notice | null = null;
  const cta = h("button", { class: "cta", type: "button", "data-testid": "hb-confirm" }, "Launch");
  let feeSol = 0;
  const need = () => launchNeedSol(s.devBuySol, feeSol);
  onWallet(() => { validate(); });
  void picked.then(() => { validate(); }, () => {});

  // Name and ticker: placeholders with a subtle byte counter inside the field
  const field = (ph: string, max: number, get: () => string, set: (v: string) => void, prefix?: string) => {
    const count = h("span", { class: "count" });
    const inp = h("input", { type: "text", value: get(), placeholder: ph, "aria-label": ph, spellcheck: "false", autocomplete: "off" });
    const upd = () => { const n = bytes(inp.value.trim()); count.textContent = `${n}/${max}`; count.className = n > max || n === 0 ? "count bad" : "count"; };
    inp.addEventListener("input", () => { set(inp.value); upd(); validate(); });
    upd();
    return h("label", { class: prefix ? "fld pre" : "fld" }, prefix ? h("span", { class: "prefix" }, prefix) : null, inp, count);
  };

  // Image: every image found in the tweet (all photos, video and GIF posters, quoted post media, the avatar) on one
  // horizontal row, the chosen one has the gold ring, Upload sits last
  const choices = [...new Set([...t.images, ...(t.avatar ? [t.avatar] : [])])];
  const strip = h("div", { class: "strip", role: "listbox", "aria-label": "Token image", "data-testid": "hb-images" });
  const file = h("input", { type: "file", accept: "image/png,image/jpeg,image/webp,image/gif", style: "display:none" });
  file.addEventListener("change", () => {
    const f = file.files?.[0]; if (!f) return;
    if (f.size > 2 * 1024 * 1024) { imgErr = notice("Image must be 2 MB or smaller", "The image must be 2 MB or smaller. Pick a smaller one or a tweet image.", false); validate(); return; }
    imgErr = null;
    const r = new FileReader(); r.onload = () => { s.upload = String(r.result); drawStrip(); }; r.readAsDataURL(f);
  });
  const tile = (src: string, on: boolean, label: string, pick: () => void, avatar = false) =>
    h("button", { class: `thumb${on ? " on" : ""}${avatar ? " av" : ""}`, type: "button", role: "option", "aria-selected": String(on), "aria-label": label, title: label, onclick: pick }, h("img", { src, alt: "" }));
  const drawStrip = () => {
    strip.replaceChildren(
      ...choices.map((u, i) => tile(u, !s.upload && s.image === u, u === t.avatar ? "Use the profile picture" : `Use image ${i + 1}`, () => { s.image = u; s.upload = null; drawStrip(); }, u === t.avatar)),
      ...(s.upload ? [tile(s.upload, true, "Your upload", () => {})] : []),
      h("button", { class: "thumb up", type: "button", "aria-label": "Upload an image", title: "Upload an image", onclick: () => file.click() }, h("span", { class: "plus" }, "+"), "Upload"));
    (strip.querySelector(".thumb.on") as HTMLElement | null)?.scrollIntoView({ block: "nearest", inline: "nearest" });
  };
  drawStrip();

  // X link: the launched post, editable, a profile link or @handle works too
  const xl = h("input", { type: "text", value: s.xLink, placeholder: "x.com link or @handle", "aria-label": "X link", spellcheck: "false", autocomplete: "off", "data-testid": "hb-xlink" });
  xl.addEventListener("input", () => { s.xLink = xl.value; validate(); });
  const xField = h("label", { class: "fld pre xl" }, h("span", { class: "prefix" }, svg(X_MARK)), xl);

  // Tier pills and the anti-sniper switch on one row
  const tierSeg = h("div", { class: "seg sm", role: "tablist", "aria-label": "Tier" });
  const drawTiers = () => tierSeg.replaceChildren(
    ...LAUNCH_TIERS.map((id) => h("button", { type: "button", role: "tab", "aria-selected": String(s.tier === id), class: s.tier === id ? "on" : "", "data-tier": id, onclick: () => { s.tier = id; drawTiers(); drawSummary(); loadQuote(); } },
      h("i", { class: "dot", style: `background:var(--hb-tier-${id})` }), TIER_LABEL[id])));
  drawTiers();
  const sw = h("button", { class: "switch sm", role: "switch", "aria-checked": String(s.antiSniper), "aria-label": "Anti-sniper", onclick: () => { s.antiSniper = !s.antiSniper; sw.setAttribute("aria-checked", String(s.antiSniper)); void ask({ type: "drawer:antisniper:set", on: s.antiSniper }).catch(() => {}); drawSummary(); loadQuote(); } });

  // Dev buy: the SOL input, the preset chips and a gear on one row of equal height. The gear opens the preset editor inline.
  const dev = h("input", { type: "text", value: String(s.devBuySol), inputmode: "decimal", autocomplete: "off", spellcheck: "false", "aria-label": "Dev buy in SOL", "data-testid": "hb-devbuy" }) as HTMLInputElement;
  const quote = h("div", { class: "quote" });
  let presets: number[] = [...DEV_PRESETS_DEFAULT];
  const chipRow = h("span", { class: "dchips", role: "group", "aria-label": "Dev buy presets" });
  const drawChips = () => chipRow.replaceChildren(...presets.map((v) => h("button", { class: `chip${Math.abs(v - s.devBuySol) < 1e-9 ? " on" : ""}`, type: "button", "aria-pressed": String(Math.abs(v - s.devBuySol) < 1e-9), "data-testid": "hb-devbuy-chip", onclick: () => setDev(v) }, fmtSol(v))));
  const setDev = (v: number) => { s.devBuySol = v; dev.value = String(v); drawChips(); drawSummary(); loadQuote(); };
  dev.addEventListener("input", () => { const v = Number(dev.value.replace(",", ".")); s.devBuySol = Number.isFinite(v) && v >= 0 ? v : 0; drawChips(); drawSummary(); loadQuote(); });
  const DEV_HELP = "Dev buy is your own buy inside the launch transaction (block 0), spent from this wallet. The tier sets the maximum.";
  const gear = h("button", { class: "dgear", type: "button", title: `${DEV_HELP} Click to edit the preset amounts.`, "aria-label": "Edit dev buy presets", "aria-expanded": "false", html: GEAR, "data-testid": "hb-devbuy-gear" });
  const pe = h("div", { class: "dpe", hidden: true, role: "group", "aria-label": "Dev buy presets", "data-testid": "hb-devbuy-editor" });
  const drawEditor = () => {
    const ins = Array.from({ length: DEV_PRESETS_MAX }, (_, i) => h("input", { type: "text", inputmode: "decimal", autocomplete: "off", spellcheck: "false", class: "dpin", value: presets[i] === undefined ? "" : String(presets[i]), placeholder: "–", "aria-label": `Preset ${i + 1} in SOL` }) as HTMLInputElement);
    const msg = h("div", { class: "dpmsg" }, `Up to ${DEV_PRESETS_MAX} amounts, 2 decimals, 0 for none, max ${DEV_BUY_MAX} SOL`);
    const save = h("button", { class: "dpb gold", type: "button", "data-testid": "hb-devbuy-save" }, "Save") as HTMLButtonElement;
    const check = () => { const c = checkDevPresets(ins.map((x) => x.value)); save.disabled = !c.ok; msg.classList.toggle("bad", !c.ok); msg.textContent = c.ok ? `Up to ${DEV_PRESETS_MAX} amounts, 2 decimals, 0 for none, max ${DEV_BUY_MAX} SOL` : c.error; return c; };
    ins.forEach((x) => { x.addEventListener("input", check); x.addEventListener("keydown", (e) => { if ((e as KeyboardEvent).key === "Enter" && !save.disabled) save.click(); }); });
    save.addEventListener("click", () => { const c = check(); if (!c.ok) return; void ask({ type: "drawer:devpresets:set", values: c.values }).then((r) => { presets = r.values; drawChips(); toggleEditor(false); }).catch((e) => { msg.textContent = (e as Error).message; msg.classList.add("bad"); }); });
    const reset = h("button", { class: "dpb", type: "button", "data-testid": "hb-devbuy-reset", onclick: () => { void ask({ type: "drawer:devpresets:set", values: null }).then((r) => { presets = r.values; drawChips(); drawEditor(); }).catch(() => {}); } }, "Reset");
    pe.replaceChildren(h("div", { class: "dphead" }, h("strong", {}, "Dev buy presets"), h("span", { class: "dphelp", title: DEV_HELP }, "Your buy in the launch tx")),
      h("div", { class: "dpins" }, ...ins.map((x) => h("span", { class: "dpcell" }, svg(SOL_MARK), x))), msg,
      h("div", { class: "dpacts" }, reset, h("span", { style: "flex:1" }), h("button", { class: "dpb", type: "button", onclick: () => toggleEditor(false) }, "Cancel"), save));
    check();
  };
  const toggleEditor = (on = pe.hidden) => { pe.hidden = !on; gear.setAttribute("aria-expanded", String(on)); gear.classList.toggle("on", on); if (on) { drawEditor(); (pe.querySelector("input") as HTMLInputElement | null)?.focus(); } };
  gear.addEventListener("click", () => toggleEditor());
  void ask({ type: "drawer:devpresets:get" }).then((r) => { presets = r.values; drawChips(); }).catch(() => {});
  drawChips();

  // Description, collapsed (still sent)
  const desc = h("textarea", { "aria-label": "Description", placeholder: "Description", maxlength: "1000" }); desc.value = s.description;
  desc.addEventListener("input", () => { s.description = desc.value; });
  const more = h("div", { class: "more", hidden: true }, desc);
  const moreBtn = h("button", { class: "moreBtn", type: "button", "aria-expanded": "false" }, "More");
  moreBtn.addEventListener("click", () => { more.hidden = !more.hidden; moreBtn.setAttribute("aria-expanded", String(!more.hidden)); moreBtn.textContent = more.hidden ? "More" : "Less"; });

  const summary = h("div", { class: "sumline", "data-testid": "hb-summary" });
  // One row, always the same height: the dev buy, then either the tier and fee mode or ONE short notice (muted red,
  // ellipsis, the detail in its title). validate() picks the notice, the wallet dropdown keeps its per wallet flags.
  const drawSummary = () => { validate(); };
  const paint = () => {
    picker.setNeed(need());
    const ws = picker.get(), tier = TIER_LABEL[s.tier] ?? "Standard", fee = s.antiSniper ? "Anti-sniper" : "Flat fee";
    const dev = h("span", { class: "sdev" }, "Dev buy ", h("strong", { class: "devamt" }, svg(SOL_MARK), `${fmtSol(s.devBuySol)} SOL`), ws.length > 1 ? " each" : "");
    summary.title = `Dev buy ${fmtSol(s.devBuySol)} SOL${ws.length > 1 ? " each" : ""} · ${tier} · ${fee}`;
    summary.classList.toggle("has-note", !!current);
    summary.replaceChildren(dev, ...(current
      ? [h("span", { class: `snote${current.blocking ? "" : " soft"}`, role: "status", title: current.title, "data-testid": "hb-notice" }, current.text)]
      : [h("span", { class: "sep" }, "·"), h("span", {}, tier), h("span", { class: "sep" }, "·"), h("span", {}, fee)]));
  };
  let qt: ReturnType<typeof setTimeout> | undefined;
  const loadQuote = () => {
    clearTimeout(qt);
    if (!(s.devBuySol > 0)) { feeSol = 0; quote.textContent = "No dev buy, you only pay network fees and rent"; validate(); return; }
    quote.textContent = "Getting a quote…";
    qt = setTimeout(() => {
      ask({ type: "quote", tier: s.tier, antiSniper: s.antiSniper, devBuySol: s.devBuySol, slippageBps: s.slippageBps })
        .then((q) => { feeSol = q.feeSol || 0; validate(); quote.textContent = `About ${q.supplyPct.toLocaleString("en-US", { maximumFractionDigits: 2 })}% of supply, ${Math.round(q.estTokens).toLocaleString("en-US", { notation: "compact", maximumFractionDigits: 2 })} tokens, max ${fmtSol(q.maxDevBuySol)} SOL`; quote.title = `About ${q.supplyPct.toLocaleString("en-US", { maximumFractionDigits: 2 })}% of supply, ${Math.round(q.estTokens).toLocaleString("en-US")} tokens, max ${fmtSol(q.maxDevBuySol)} SOL on this tier`; })
        .catch((e) => { quote.textContent = (e as Error).message; quote.title = (e as Error).message; });
    }, 350);
  };

  body.replaceChildren(
    strip, file,
    h("div", { class: "names" }, field("Name", NAME_MAX_BYTES, () => s.name, (v) => { s.name = v; }), field("Ticker", TICKER_MAX_BYTES, () => s.ticker, (v) => { s.ticker = v.toUpperCase(); }, "$")),
    xField,
    h("div", { class: "r2" }, tierSeg, tip("Higher and Max raise the migration target and the creator share. Max targets 250 SOL on mainnet, and the highbar API may ask for $HIGHER in the wallet for it."), h("span", { style: "flex:1" }),
      h("span", { class: "as" }, "Anti-sniper", tip("Starts the trading fee at 25% and decays it to 1% over the first minute, so bots that snipe block 0 pay for it.")), sw),
    h("div", {}, h("div", { class: "r3" }, h("div", { class: "solin" }, svg(SOL_MARK), dev), chipRow, h("span", { style: "flex:1" }), gear), pe,
      h("div", { class: "qrow" }, quote, moreBtn), more),
  );
  foot.replaceChildren(summary, cta, poweredBy());
  function validate() {
    const n = bytes(s.name.trim()), k = bytes(s.ticker.trim());
    const ws = picker.get();
    const ok = ws.filter((w) => !isShort(w.sol, need()));
    const form = !n || n > NAME_MAX_BYTES ? notice("Name must be 1 to 32 bytes") : !k || k > TICKER_MAX_BYTES ? notice("Ticker must be 1 to 10 bytes")
      : normalizeXLink(s.xLink) === null ? notice("Check the X link", "The X link must be an x.com or twitter.com link or an @handle") : null;
    current = pickNotice(form, walletNotice(ws, need()), imgErr);
    xField.classList.toggle("bad", normalizeXLink(s.xLink) === null);
    cta.textContent = ws.length > 1 ? `Launch ${ok.length} token${ok.length === 1 ? "" : "s"}` : "Launch";
    const blocked = !!current?.blocking;
    (cta as HTMLButtonElement).disabled = blocked;
    paint();
    return !blocked;
  }
  cta.addEventListener("click", (e) => {
    if (!e.isTrusted || !validate()) return;
    const ws = picker.get();
    if (ws.length) ask({ type: "drawer:wallets:set", ids: ws.map((w) => w.id) }).catch(() => {});
    picker.lock();
    if (ws.length > 1) runLaunchMulti(body, foot, s, false, ws);
    else runLaunch(body, foot, s, false, ws[0] ?? null);
  });
  drawSummary(); loadQuote(); validate();
}

function runLaunch(body: HTMLElement, foot: HTMLElement, s: DrawerState, instant: boolean, wallet: WalletRow | null) {
  const opts: LaunchOpts = { tier: s.tier, antiSniper: s.antiSniper, devBuySol: s.devBuySol, slippageBps: s.slippageBps, description: s.description };
  const items = new Map<LaunchStep, HTMLLIElement>();
  const list = h("ol", { class: "steps" }, ...STEPS.map((x, i) => { const li = h("li", {}, h("span", { class: "b" }, String(i + 1)), x.label); items.set(x.id, li); return li; }));
  const head = h("div", { class: "preview" }, s.upload || s.image ? h("img", { src: s.upload ?? s.image!, alt: "" }) : h("span", { class: "ph" }),
    h("div", {}, h("strong", {}, s.name), h("div", { class: "muted" }, `$${s.ticker}`)));
  const devLine = h("div", { class: "summary" }, h("div", { class: "line" }, h("span", {}, instant ? "Instant launch with your presets. Dev buy" : "Dev buy"), h("span", { class: "big" }, svg(SOL_MARK), `${fmtSol(s.devBuySol)} SOL`)));
  const from = wallet ? h("div", { class: "fromw", "data-testid": "hb-from-wallet" }, "From ", h("strong", {}, wallet.label), h("span", { class: "mono" }, short(wallet.address, 4))) : null;
  body.replaceChildren(head, devLine, ...(from ? [from] : []), list);
  foot.replaceChildren(h("div", { class: "muted" }, "Keep this tab open until it confirms. If you close it the launch keeps going and shows up in Create history."));
  const mark = (step: LaunchStep) => {
    let seen = true;
    for (const x of STEPS) {
      const li = items.get(x.id)!;
      if (x.id === step) { seen = false; li.className = "now"; continue; }
      li.className = seen ? "done" : "";
      if (seen) li.querySelector(".b")!.innerHTML = CHECK;
    }
  };
  primeSfx();
  const port = chrome.runtime.connect({ name: "launch" });
  port.onMessage.addListener((m: LaunchPortOut) => {
    if (m.type === "step") mark(m.step);
    else if (m.type === "done") {
      mark("done");
      items.forEach((li) => { li.className = "done"; li.querySelector(".b")!.innerHTML = CHECK; });
      list.remove();
      body.append(h("div", { class: "result ok", "data-testid": "hb-done" },
        h("div", { class: "rhead" }, h("strong", {}, "Launch success"), h("span", { class: "muted" }, "·"), h("a", { class: "link sm", href: m.result.tokenUrl ?? m.result.solscanUrl, target: "_blank", rel: "noopener noreferrer", "data-testid": "hb-view-token" }, "View token"), h("span", { style: "flex:1" }), h("a", { class: "link sm", href: m.result.solscanUrl, target: "_blank", rel: "noopener noreferrer" }, "View tx")),
        caLine(m.result.mint), terminalRow(m.result.mint, m.result.tokenUrl)));
      foot.replaceChildren(h("button", { class: "ghost", title: "Back to the form for a new launch", "data-testid": "hb-done-close", onclick: backToForm }, "Close"));
      playSfx("ok");
      port.disconnect();
    } else if (m.type === "error") {
      playSfx("err");
      body.append(h("div", { class: "result" }, h("strong", { class: "warn" }, "Launch stopped"), h("span", { class: "muted" }, m.error)));
      foot.replaceChildren(h("button", { class: "ghost", onclick: closeDrawer }, "Close"));
      port.disconnect();
    }
  });
  const msg: LaunchPortIn = { type: "start", draft: { name: s.name.trim(), ticker: s.ticker.trim(), imageUrl: s.upload ? null : s.image, tweetUrl: normalizeXLink(s.xLink) ?? "", description: s.description }, opts, imageDataUrl: s.upload, walletId: wallet?.id ?? null };
  port.postMessage(msg);
}

const MULTI_STATUS: Record<string, string> = { queued: "Waiting", image: "Uploading image", metadata: "Uploading metadata", mint: "Building", sign: "Signing", cosign: "Co-signing", send: "Sending", confirm: "Confirming", done: "Launched", failed: "Failed", skipped: "Skipped" };
const draftOf = (s: DrawerState): LaunchPortIn["draft"] => ({ name: s.name.trim(), ticker: s.ticker.trim(), imageUrl: s.upload ? null : s.image, tweetUrl: normalizeXLink(s.xLink) ?? "", description: s.description });
/** Multi create progress: one compact row per wallet (label, status, then the token and Solscan links or the error).
 *  Rows scroll inside the drawer. Nothing opens by itself, the links are there for each token. */
function runLaunchMulti(body: HTMLElement, foot: HTMLElement, s: DrawerState, instant: boolean, wallets: WalletRow[]) {
  const opts: LaunchOpts = { tier: s.tier, antiSniper: s.antiSniper, devBuySol: s.devBuySol, slippageBps: s.slippageBps, description: s.description };
  const head = h("div", { class: "preview" }, s.upload || s.image ? h("img", { src: s.upload ?? s.image!, alt: "" }) : h("span", { class: "ph" }),
    h("div", {}, h("strong", {}, s.name), h("div", { class: "muted" }, `$${s.ticker} · ${wallets.length} tokens, one per wallet`)));
  const devLine = h("div", { class: "summary" }, h("div", { class: "line" }, h("span", {}, instant ? "Instant launch with your presets. Dev buy each" : "Dev buy each"), h("span", { class: "big" }, svg(SOL_MARK), `${fmtSol(s.devBuySol)} SOL`)));
  const list = scrollFade(h("div", { class: "mrows", "data-testid": "hb-multi-rows" }));
  const tally = h("div", { class: "muted mtally", "data-testid": "hb-multi-tally" }, "Starting…");
  const draw = (rows: MultiRow[]) => list.replaceChildren(...rows.map((r) => {
    const st = r.status === "running" ? (r.step ? MULTI_STATUS[r.step] : "Checking balance") : MULTI_STATUS[r.status];
    const extra = r.status === "done" && r.result
      ? h("span", { class: "mlinks" }, caLine(r.result.mint, true), terminalRow(r.result.mint, r.result.tokenUrl, true), h("a", { class: "link sm", href: r.result.solscanUrl, target: "_blank", rel: "noopener noreferrer" }, "Solscan"))
      : (r.status === "failed" || r.status === "skipped") && r.error ? h("span", { class: "merr", title: r.error }, r.error) : null;
    return h("div", { class: `mrow ${r.status}`, "data-wallet": r.id, "data-status": r.status },
      h("span", { class: "mdot" }), h("span", { class: "mtxt" }, h("span", { class: "mhead" }, h("strong", {}, r.label), h("span", { class: "mono muted" }, short(r.address, 4)), h("span", { style: "flex:1" }), h("span", { class: "mst" }, st)), extra));
  }));
  draw(wallets.map((w) => ({ id: w.id, label: w.label, address: w.address, status: "queued" })));
  body.replaceChildren(head, devLine, list);
  foot.replaceChildren(tally, h("div", { class: "muted" }, "Keep this tab open until they confirm. If you close it the launches keep going and show up in Create history of each wallet."));
  const count = (rows: MultiRow[]) => { const d = rows.filter((r) => r.status === "done").length, f = rows.filter((r) => r.status === "failed").length, k = rows.filter((r) => r.status === "skipped").length;
    return [`${d} launched`, ...(f ? [`${f} failed`] : []), ...(k ? [`${k} skipped`] : [])].join(" · "); };
  primeSfx();
  const port = chrome.runtime.connect({ name: "launch" });
  port.onMessage.addListener((m: LaunchPortOut) => {
    if (m.type === "multi") { draw(m.rows); tally.textContent = `${m.rows.filter((r) => r.status !== "queued" && r.status !== "running").length} of ${m.rows.length} finished · ${count(m.rows)}`; }
    else if (m.type === "multi:done") {
      draw(m.rows);
      playSfx(m.rows.some((r) => r.status === "done") ? "ok" : "err");
      foot.replaceChildren(h("div", { class: "mtally done", "data-testid": "hb-multi-done" }, count(m.rows)), h("button", { class: "ghost", title: "Back to the form for a new launch", "data-testid": "hb-done-close", onclick: backToForm }, "Close"));
      port.disconnect();
    } else if (m.type === "error") {
      playSfx("err");
      body.append(h("div", { class: "result" }, h("strong", { class: "warn" }, "Launch stopped"), h("span", { class: "muted" }, m.error)));
      foot.replaceChildren(h("button", { class: "ghost", onclick: closeDrawer }, "Close"));
      port.disconnect();
    }
  });
  const msg: LaunchPortIn = { type: "start", draft: draftOf(s), opts, imageDataUrl: s.upload, walletIds: wallets.map((w) => w.id) };
  port.postMessage(msg);
}

chrome.runtime.onMessage.addListener((m: ToContent) => {
  if (m?.type === "status:changed") void refresh().then(() => ca.refresh());
  if (m?.type === "hotkey:launch") { const k = hotkeyTweet(); if (k) openDrawer(k.t, { instant: instantOn(), anchor: buttonBox(k.a) }); }
});

// Token detection: the CA button under the name row of tweets that name a Solana token, and its trade popup
const ca = initCa({ status: () => status, injectFonts, theme, caLine, terminalRow, walletSwitcher });

// One MutationObserver for the whole content script (launch buttons and token detection). The callback only collects nodes;
// the work runs in an idle callback, batched. Only childList changes are observed: like, repost and view counts (text and
// attribute churn) never wake it, and a tweet is re-scanned for tokens only when its text or link card changed.
const ART = 'article[data-testid="tweet"]', TEXT_SEL = '[data-testid="tweetText"],[data-testid="card.wrapper"]';
const added: Element[] = [], touched = new Set<Node>();
let mutIdle = false;
function flushMutations() {
  mutIdle = false;
  const list = added.splice(0), tl = [...touched]; touched.clear();
  const arts = new Set<HTMLElement>();
  for (const n of list) {
    if (!n.isConnected || n.hasAttribute("data-hb-host") || n.hasAttribute("data-hb-ca-host")) continue;
    if (n.matches(ART)) arts.add(n as HTMLElement);
    else if (n.firstElementChild) n.querySelectorAll<HTMLElement>(ART).forEach((a) => arts.add(a));
  }
  for (const a of arts) { addButton(a); ca.queue(a); }
  for (const t of tl) {
    const el = t instanceof Element ? t : t.parentElement;
    if (!el?.isConnected) continue;
    const a = el.closest<HTMLElement>(ART);
    if (!a || arts.has(a)) continue;
    if (!processed.has(a)) addButton(a); // the action row rendered after the tweet
    if (el.closest(TEXT_SEL)) ca.queue(a);
  }
}
new MutationObserver((muts) => {
  for (const m of muts) {
    if (!m.addedNodes.length) continue;
    for (const n of m.addedNodes) if (n.nodeType === 1) added.push(n as Element);
    touched.add(m.target);
  }
  if (!mutIdle && (added.length || touched.size)) { mutIdle = true; onIdle(flushMutations); }
}).observe(document.documentElement, { childList: true, subtree: true });
void refresh().then(() => { scan(); ca.refresh(); });
// x.com switches themes by restyling body and html, keep the buttons legible on Default, Dim and Lights out
const themeObs = new MutationObserver(() => syncTheme());
themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ["style", "class"] });
if (document.body) themeObs.observe(document.body, { attributes: true, attributeFilter: ["style", "class"] });
else document.addEventListener("DOMContentLoaded", () => { themeObs.observe(document.body, { attributes: true, attributeFilter: ["style", "class"] }); syncTheme(); }, { once: true });
