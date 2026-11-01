/** Token detection on x.com and the CA popup. Tweets that name a Solana token (a CA in the text, a token page link or a $TICKER
 *  that resolves without doubt) get a small button under the name row. It opens a draggable popup with the token's price,
 *  24h change, market cap, volume, a live chart and a buy and sell box. The popup itself lives in ca-popup.ts, loaded on first
 *  use; this file only detects tokens and places the buttons. */
import type { WalletRow, WalletStatus } from "../lib/messages";
import { tweetCandidates, type PillStats } from "../lib/ca";
import { fmtUsdShort } from "../lib/tween";
import { tweenText } from "./tween";
import { short } from "../lib/format";
import { HB_MARK } from "../lib/icons";
import { readPos, type Pos } from "../lib/place";
import { adoptCss, ask, h, onIdle, svg } from "./dom";
import { CA_PILL_CSS } from "./styles";

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
    const cells: Cell[] = [];
    root.replaceChildren(...found.map((f) => {
      const mc = h("b", { "data-k": "mc" }), vol = h("b", { "data-k": "vol" }), liq = h("b", { "data-k": "liq" });
      const known = statC.get(f.mint)?.v;
      for (const [el, v] of [[mc, known?.mcapUsd], [vol, known?.volume24hUsd], [liq, known?.liquidityUsd]] as const) tweenText(el, v ?? null, fmtUsdShort);
      const mk = h("span", { class: `mk${known ? "" : " ld"}` }, h("i", {}, "·"), "MC ", mc, h("i", {}, "·"), "Vol ", vol, h("i", {}, "·"), "Liq ", liq);
      cells.push({ mint: f.mint, mc, vol, liq, mk });
      const b = h("button", { type: "button", title: `Trade ${f.label} · ${f.mint}`, "aria-label": `Open the token popup for ${f.label}`, "data-testid": "hb-ca-btn", "data-mint": f.mint },
        svg(HB_MARK), f.label.startsWith("$") ? f.label : h("span", { class: "mono" }, f.label), mk, svg(ARROW));
      (b.firstChild as HTMLElement).classList.add("hbm");
      b.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); openPopup(f.mint, f.label, b.getBoundingClientRect(), a.getBoundingClientRect(), a.closest('[data-testid="primaryColumn"]')?.getBoundingClientRect() ?? null); });
      // pointer resting on the button: load the token fully now, so the popup opens on cached data
      let hov: ReturnType<typeof setTimeout> | null = null;
      b.addEventListener("pointerenter", () => { hov = setTimeout(() => { void loadPopup().catch(() => { popMod = null; }); void ask({ type: "ca:prefetch", mints: [f.mint], full: true }).catch(() => {}); }, 120); });
      b.addEventListener("pointerleave", () => { if (hov) clearTimeout(hov); });
      return b;
    }));
    adoptCss(root, CA_PILL_CSS);
    pillCells.set(host, cells);
    pio.observe(host);
  }
  // ---------------- pill market numbers ----------------
  // Only pills on screen (and a quarter screen around it) ask, in one batched ca:stats call for every mint that is not fresh
  // (45 s per mint, the worker shares the DexScreener cache with the popup). Nothing runs for pills off screen, while the
  // tab is hidden, or when no pill is in view; new numbers glide into place (tweenText), the pill is never rebuilt for them.
  type Cell = { mint: string; mc: HTMLElement; vol: HTMLElement; liq: HTMLElement; mk: HTMLElement };
  const STATS_TTL = 45_000;
  const statC = new Map<string, { v: PillStats; at: number }>();
  const pillCells = new WeakMap<HTMLElement, Cell[]>();
  const inView = new Set<HTMLElement>();
  let statT: ReturnType<typeof setTimeout> | null = null, statBusy = false;
  const pio = new IntersectionObserver((es) => {
    for (const e of es) { const el = e.target as HTMLElement; if (e.isIntersecting) inView.add(el); else inView.delete(el); }
    schedStats(150);
  }, { rootMargin: "25% 0px" });
  function schedStats(ms: number) {
    if (statT || document.visibilityState !== "visible" || !inView.size) return;
    statT = setTimeout(() => { statT = null; void tickStats(); }, ms);
  }
  const paint = (mints: Set<string>) => {
    for (const host of inView) for (const c of pillCells.get(host) ?? []) {
      if (!mints.has(c.mint)) continue;
      const v = statC.get(c.mint)?.v;
      if (!v) continue;
      c.mk.classList.remove("ld");
      tweenText(c.mc, v.mcapUsd, fmtUsdShort); tweenText(c.vol, v.volume24hUsd, fmtUsdShort); tweenText(c.liq, v.liquidityUsd, fmtUsdShort);
    }
  };
  async function tickStats() {
    if (document.visibilityState !== "visible") return;
    for (const h of inView) if (!h.isConnected) { inView.delete(h); pio.unobserve(h); }
    const now = Date.now();
    const mints = new Set<string>();
    for (const h of inView) for (const c of pillCells.get(h) ?? []) mints.add(c.mint);
    paint(mints); // pills re-rendered with numbers already known
    const staleAll = [...mints].filter((m) => { const c = statC.get(m); return !c || now - c.at > STATS_TTL; }), stale = staleAll.slice(0, 30);
    if (stale.length && !statBusy) {
      statBusy = true;
      try {
        const r = await ask({ type: "ca:stats", mints: stale });
        const got = new Set<string>();
        for (const x of r) { statC.set(x.mint, { v: x, at: Date.now() }); got.add(x.mint); }
        paint(got);
      } catch { /* the next tick asks again */ }
      finally { statBusy = false; }
      if (statC.size > 500) for (const [m, c] of statC) if (Date.now() - c.at > 5 * 60_000) statC.delete(m);
    }
    // while pills stay in view: look again when the oldest of them goes stale
    schedStats(staleAll.length > 30 ? 1000 : 15_000);
  }
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") schedStats(100);
    else if (statT) { clearTimeout(statT); statT = null; }
  });

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
  // Tweets to (re)scan come from the content script's one shared, idle-batched MutationObserver (index.ts): new tweets, and
  // tweets whose text or link card changed. Like and view counts never get here.
  const pending = new Set<HTMLElement>();
  let idle = false;
  const flush = () => { idle = false; const list = [...pending]; pending.clear(); for (const a of list) if (a.isConnected) scanArticle(a); };
  const queue = (a: HTMLElement) => { pending.add(a); if (!idle) { idle = true; onIdle(flush); } };
  const scanAll = () => document.querySelectorAll<HTMLElement>('article[data-testid="tweet"]').forEach(queue);
  scanAll();

  // ---------------- popup ----------------
  let popHost: HTMLElement | null = null, popCleanup: (() => void) | null = null;
  let savedPos: Pos | null = null;
  void ask({ type: "ca:pos:get" }).then((p) => { savedPos = readPos(p); }).catch(() => {});
  let openSeq = 0;
  const close = () => { openSeq++; popCleanup?.(); popCleanup = null; popHost?.remove(); popHost = null; };
  // the popup module is fetched once, the first time a token button is hovered or clicked
  let popMod: Promise<typeof import("./ca-popup")> | null = null;
  const loadPopup = () => (popMod ??= import(chrome.runtime.getURL("ca-popup.js")) as Promise<typeof import("./ca-popup")>);

  function openPopup(mint: string, label: string, anchor: DOMRect | null, tweet: DOMRect | null = null, column: DOMRect | null = null) {
    close();
    const my = openSeq;
    void loadPopup().then((m) => {
      if (my !== openSeq) return; // closed, or another button was clicked meanwhile
      k.injectFonts();
      const r = m.mountPopup({ k, mint, label, anchor, tweet, column, savedPos: () => savedPos, setSavedPos: (p) => { savedPos = p; }, close });
      popHost = r.host; popCleanup = r.cleanup;
    }).catch((e) => console.warn("highbar: popup failed to load", e));
  }

  return {
    /** Settings changed (Token detection on or off): rescan every tweet. */
    refresh() { document.querySelectorAll<HTMLElement>('article[data-testid="tweet"]').forEach((a) => { want.delete(a); done.delete(a); }); scanAll(); },
    theme(t: "light" | "dark") { document.querySelectorAll<HTMLElement>(`[${HOST}]`).forEach((el) => el.setAttribute("data-hb-theme", t)); },
    open: openPopup,
    /** A tweet appeared or its text changed (from the shared observer). */
    queue,
  };
}
